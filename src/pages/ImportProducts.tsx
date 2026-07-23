import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertTriangle, Loader2, PackagePlus } from 'lucide-react'
import { supabase, Category, Boutique } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAudit } from '../lib/audit'
import { PageHeader, Spinner, Badge } from '../components/ui'
import { formatXOF } from '../lib/utils'

type Row = {
  name: string
  purchase_price: number
  sale_price: number
  quantity: number
  category: string
  sku: string
  error?: string
}

type Result = { created: number; failed: number; stock: number; details: string[] }

// XOF n'a pas de décimales : on ne garde que les chiffres.
// "80.000 F" -> 80000, "1 250" -> 1250
function toInt(s: string): number {
  const digits = (s || '').replace(/[^\d]/g, '')
  return digits ? parseInt(digits, 10) : 0
}

function detectSep(text: string): string {
  const line = text.split(/\r?\n/).find((l) => l.trim()) || ''
  if (line.includes('\t')) return '\t'
  if (line.includes(';')) return ';'
  return ','
}

function slugSku(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20)
  return s || 'PROD'
}

function parseRows(text: string): Row[] {
  const sep = detectSep(text)
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  // Ignore une éventuelle ligne d'en-tête
  const first = lines[0].toLowerCase()
  const start = first.includes('nom') && (first.includes('prix') || first.includes('achat')) ? 1 : 0
  const rows: Row[] = []
  for (let i = start; i < lines.length; i++) {
    const c = lines[i].split(sep).map((x) => x.trim())
    const name = c[0] || ''
    const row: Row = {
      name,
      purchase_price: toInt(c[1] || ''),
      sale_price: toInt(c[2] || ''),
      quantity: toInt(c[3] || ''),
      category: c[4] || '',
      sku: (c[5] || '').trim(),
    }
    if (!name) row.error = 'Nom manquant'
    rows.push(row)
  }
  return rows
}

export default function ImportProducts() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [boutiqueId, setBoutiqueId] = useState('')
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (!isAdmin) { navigate('/products'); return }
    ;(async () => {
      const [cats, bts] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('boutiques').select('*').eq('is_active', true).order('name'),
      ])
      setCategories((cats.data as Category[]) ?? [])
      const b = (bts.data as Boutique[]) ?? []
      setBoutiques(b)
      setBoutiqueId(profile?.boutique_id ?? b[0]?.id ?? '')
      setLoading(false)
    })()
  }, [])

  const valid = useMemo(() => (rows ?? []).filter((r) => !r.error), [rows])
  const totalQty = useMemo(() => valid.reduce((s, r) => s + r.quantity, 0), [valid])

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  const analyze = () => {
    setResult(null)
    setRows(parseRows(text))
  }

  const doImport = async () => {
    if (valid.length === 0) return
    setImporting(true)

    const { data: existing } = await supabase.from('products').select('sku')
    const skuSet = new Set(((existing as { sku: string }[]) ?? []).map((p) => p.sku.toUpperCase()))
    const cats = [...categories]
    const findCat = (name: string) => cats.find((c) => c.name.toLowerCase() === name.toLowerCase())

    const res: Result = { created: 0, failed: 0, stock: 0, details: [] }

    for (const r of valid) {
      // Catégorie (créée si absente)
      let category_id: string | null = null
      if (r.category) {
        let cat = findCat(r.category)
        if (!cat) {
          const { data: newCat } = await supabase.from('categories').insert({ name: r.category }).select().single()
          if (newCat) { cats.push(newCat as Category); cat = newCat as Category }
        }
        category_id = cat?.id ?? null
      }

      // SKU unique
      let sku = r.sku || slugSku(r.name)
      const base = sku
      let n = 1
      while (skuSet.has(sku.toUpperCase())) sku = `${base}-${n++}`
      skuSet.add(sku.toUpperCase())

      // Produit
      const { data: prod, error } = await supabase
        .from('products')
        .insert({ sku, name: r.name, category_id, purchase_price: r.purchase_price, sale_price: r.sale_price })
        .select()
        .single()
      if (error || !prod) {
        res.failed++
        res.details.push(`❌ ${r.name} — ${error?.message ?? 'erreur'}`)
        continue
      }
      res.created++
      await logAudit('create', 'products', prod.id, null, prod)

      // Stock dans la boutique choisie
      if (r.quantity > 0 && boutiqueId) {
        const { data: st } = await supabase
          .from('stock_items')
          .select('*')
          .eq('product_id', prod.id)
          .eq('boutique_id', boutiqueId)
          .maybeSingle()
        if (st) {
          await supabase.from('stock_items').update({ quantity: st.quantity + r.quantity, updated_at: new Date().toISOString() }).eq('id', st.id)
        } else {
          await supabase.from('stock_items').insert({ product_id: prod.id, boutique_id: boutiqueId, quantity: r.quantity })
        }
        await supabase.from('stock_movements').insert({
          product_id: prod.id,
          boutique_id: boutiqueId,
          quantity: r.quantity,
          movement_type: 'adjustment',
          notes: 'Import produits',
          performed_by: profile?.id,
        })
        res.stock += r.quantity
      }
    }

    await logAudit('import_products', 'products', null, null, { created: res.created, failed: res.failed })
    setResult(res)
    setImporting(false)
    setRows(null)
    setText('')
  }

  if (loading) return <Spinner lg />

  const boutiqueName = boutiques.find((b) => b.id === boutiqueId)?.name ?? ''

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Importer des produits"
        subtitle="Ajoutez plusieurs produits d'un coup depuis une liste ou un fichier"
        actions={<button onClick={() => navigate('/products')} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Retour</button>}
      />

      {/* Résultat d'import */}
      {result && (
        <div className="card p-5 mb-5 border-success-200 bg-success-50">
          <div className="flex items-center gap-2 text-success-700 font-semibold">
            <CheckCircle2 className="w-5 h-5" /> Import terminé
          </div>
          <p className="text-sm text-neutral-700 mt-2">
            <strong>{result.created}</strong> produit(s) créé(s)
            {result.stock > 0 && <> · <strong>{result.stock}</strong> unité(s) mises en stock à {boutiqueName}</>}
            {result.failed > 0 && <> · <span className="text-error-600">{result.failed} échec(s)</span></>}
          </p>
          {result.details.length > 0 && (
            <ul className="mt-2 text-xs text-error-600 space-y-0.5">
              {result.details.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={() => navigate('/products')}>Voir les produits</button>
            <button className="btn-secondary" onClick={() => setResult(null)}>Importer une autre liste</button>
          </div>
        </div>
      )}

      {!result && (
        <div className="card p-6 space-y-5">
          {/* Boutique cible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Boutique pour le stock</label>
              <select className="input" value={boutiqueId} onChange={(e) => setBoutiqueId(e.target.value)}>
                {boutiques.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="btn-secondary cursor-pointer w-full justify-center">
                <FileText className="w-4 h-4" /> Choisir un fichier CSV
                <input type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
            </div>
          </div>

          {/* Format attendu */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-xs text-neutral-600">
            <p className="font-semibold text-neutral-700 mb-1">Format : une ligne par produit, colonnes séparées par <code>;</code> (ou virgule / tabulation)</p>
            <code className="block">nom ; prix_achat ; prix_vente ; quantité ; catégorie ; sku</code>
            <p className="mt-1 text-neutral-500">Seul le <strong>nom</strong> est obligatoire. Le SKU est généré si absent. Exemple :</p>
            <code className="block mt-1">Batterie HZ 12V 100A ; 80000 ; 100000 ; 6 ; Batteries</code>
          </div>

          {/* Zone de collage */}
          <div>
            <label className="label">Collez votre liste ici</label>
            <textarea
              className="input min-h-[180px] font-mono text-sm"
              placeholder={'Batterie HZ 12V 100A ; 80000 ; 100000 ; 6 ; Batteries\nOnduleur Deye 6kVA ; 350000 ; 450000 ; 1 ; Onduleurs'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" onClick={analyze} disabled={!text.trim()}>
              <FileText className="w-4 h-4" /> Analyser
            </button>
          </div>

          {/* Aperçu */}
          {rows && (
            <div className="border-t border-neutral-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-neutral-900">Aperçu — {valid.length} produit(s) valide(s){rows.length - valid.length > 0 && `, ${rows.length - valid.length} ignoré(s)`}</h3>
                {totalQty > 0 && <Badge variant="primary">{totalQty} unités → {boutiqueName}</Badge>}
              </div>
              <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-xs uppercase text-neutral-500">
                      <th className="text-left px-3 py-2">Produit</th>
                      <th className="text-right px-3 py-2">Achat</th>
                      <th className="text-right px-3 py-2">Vente</th>
                      <th className="text-right px-3 py-2">Qté</th>
                      <th className="text-left px-3 py-2 hidden sm:table-cell">Catégorie</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {rows.map((r, i) => (
                      <tr key={i} className={r.error ? 'bg-error-50/40' : ''}>
                        <td className="px-3 py-2 font-medium text-neutral-900">{r.name || <span className="text-neutral-400 italic">(vide)</span>}</td>
                        <td className="px-3 py-2 text-right text-neutral-600">{formatXOF(r.purchase_price)}</td>
                        <td className="px-3 py-2 text-right text-neutral-600">{formatXOF(r.sale_price)}</td>
                        <td className="px-3 py-2 text-right text-neutral-600">{r.quantity || '—'}</td>
                        <td className="px-3 py-2 hidden sm:table-cell text-neutral-600">{r.category || '—'}</td>
                        <td className="px-3 py-2 text-center">
                          {r.error ? <Badge variant="error">{r.error}</Badge> : <CheckCircle2 className="w-4 h-4 text-success-500 inline" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button className="btn-secondary" onClick={() => setRows(null)}>Annuler</button>
                <button className="btn-primary" onClick={doImport} disabled={importing || valid.length === 0}>
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
                  Importer {valid.length} produit(s)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
