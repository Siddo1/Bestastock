import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, Trash2, Package, Search, X, Plus } from 'lucide-react'
import { supabase, Product, Supplier, Boutique } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAudit } from '../lib/audit'
import { PageHeader, Spinner } from '../components/ui'
import { formatXOF, cn } from '../lib/utils'

type Line = { product_id: string; quantity: string; unit_cost: string }

const MAX_RESULTS = 30

// Minuscules + suppression des accents, pour que « eclairage » trouve « Éclairage »
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function PurchaseForm() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const canModify = isAdmin || profile?.can_modify_stock
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [supplierId, setSupplierId] = useState(searchParams.get('supplier') ?? '')
  const [boutiqueId, setBoutiqueId] = useState(profile?.boutique_id ?? '')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})

  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [flashId, setFlashId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!canModify) { navigate('/purchases'); return }
    loadData()
  }, [])

  // Stock actuel de la boutique sélectionnée, affiché dans les résultats et les lignes
  useEffect(() => {
    if (!boutiqueId) { setStockMap({}); return }
    supabase.from('stock_items').select('product_id, quantity').eq('boutique_id', boutiqueId).then(({ data }) => {
      const map: Record<string, number> = {}
      for (const s of (data as { product_id: string; quantity: number }[]) ?? []) map[s.product_id] = s.quantity
      setStockMap(map)
    })
  }, [boutiqueId])

  // Ferme la liste de résultats au clic en dehors
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const loadData = async () => {
    const [s, p, b] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('products').select('*, category:categories(*)').eq('is_active', true).order('name'),
      supabase.from('boutiques').select('*').eq('is_active', true).order('name'),
    ])
    const bList = (b.data as Boutique[]) ?? []
    setSuppliers((s.data as Supplier[]) ?? [])
    setProducts((p.data as Product[]) ?? [])
    setBoutiques(bList)
    if (!boutiqueId && bList.length > 0) setBoutiqueId(bList[0].id)
    setLoading(false)
  }

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const results = useMemo(() => {
    const terms = normalize(search.trim()).split(/\s+/).filter(Boolean)
    if (terms.length === 0) return []
    const matches = products.filter((p) => {
      const haystack = normalize([p.name, p.sku, p.barcode ?? '', p.category?.name ?? ''].join(' '))
      return terms.every((t) => haystack.includes(t))
    })
    // Correspondance exacte du code-barres / SKU en premier (scan), puis début de nom
    const q = normalize(search.trim())
    const rank = (p: Product) => {
      if ((p.barcode && normalize(p.barcode) === q) || normalize(p.sku) === q) return 0
      if (normalize(p.name).startsWith(q)) return 1
      return 2
    }
    return matches.sort((a, b) => rank(a) - rank(b)).slice(0, MAX_RESULTS)
  }, [products, search])

  useEffect(() => { setActiveIdx(0) }, [search])

  // Garde l'élément actif visible lors de la navigation au clavier
  useEffect(() => {
    const el = resultsRef.current?.children[activeIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const total = useMemo(() => {
    return lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0)
  }, [lines])

  const updateLine = (idx: number, field: keyof Line, value: string) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx))

  const addProduct = (product: Product) => {
    setLines((prev) => {
      const existing = prev.findIndex((l) => l.product_id === product.id)
      if (existing >= 0) {
        // Déjà dans la liste : on incrémente la quantité au lieu de créer un doublon
        return prev.map((l, i) => i === existing ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l)
      }
      return [...prev, { product_id: product.id, quantity: '1', unit_cost: String(product.purchase_price ?? '') }]
    })
    setFlashId(product.id)
    setTimeout(() => setFlashId((id) => (id === product.id ? null : id)), 800)
    setSearch('')
    setShowResults(false)
    searchRef.current?.focus()
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setShowResults(true)
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // Empêche la soumission du formulaire ; Entrée ajoute le produit surligné
      e.preventDefault()
      if (results[activeIdx]) addProduct(results[activeIdx])
    } else if (e.key === 'Escape') {
      setShowResults(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const validLines = lines.filter((l) => l.product_id && Number(l.quantity) > 0)
    if (!boutiqueId) { setError('Sélectionnez une boutique.'); return }
    if (validLines.length === 0) { setError('Ajoutez au moins un article.'); return }

    setSaving(true)
    const { data: purchase, error: pErr } = await supabase.from('purchases').insert({
      supplier_id: supplierId || null,
      boutique_id: boutiqueId,
      total_amount: total,
      notes: notes.trim() || null,
    }).select().single()
    if (pErr || !purchase) { setError(pErr?.message ?? 'Erreur'); setSaving(false); return }

    const items = validLines.map((l) => ({
      purchase_id: purchase.id,
      product_id: l.product_id,
      quantity: Number(l.quantity),
      unit_cost: Number(l.unit_cost) || 0,
    }))
    await supabase.from('purchase_items').insert(items)

    // Increment stock + create movements
    for (const item of validLines) {
      const { data: stock } = await supabase.from('stock_items').select('*').eq('product_id', item.product_id).eq('boutique_id', boutiqueId).maybeSingle()
      if (stock) {
        await supabase.from('stock_items').update({ quantity: stock.quantity + Number(item.quantity), updated_at: new Date().toISOString() }).eq('id', stock.id)
      } else {
        await supabase.from('stock_items').insert({ product_id: item.product_id, boutique_id: boutiqueId, quantity: Number(item.quantity) })
      }
      await supabase.from('stock_movements').insert({
        product_id: item.product_id,
        boutique_id: boutiqueId,
        quantity: Number(item.quantity),
        movement_type: 'purchase',
        reference_id: purchase.id,
        notes: `Achat ${purchase.id.slice(0, 8)}`,
        performed_by: profile?.id,
      })
    }

    await logAudit('create_purchase', 'purchases', purchase.id, null, { total, supplierId, boutiqueId })
    setSaving(false)
    navigate('/purchases')
  }

  if (loading) return <Spinner lg />

  const hasQuery = search.trim().length > 0

  return (
    <div className="max-w-3xl">
      <PageHeader title="Nouvel achat fournisseur" actions={<button onClick={() => navigate('/purchases')} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Retour</button>} />
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fournisseur</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— Aucun —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Boutique *</label>
            <select className="input" value={boutiqueId} onChange={(e) => setBoutiqueId(e.target.value)} disabled={!isAdmin}>
              {boutiques.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Articles</label>

          {/* Moteur de recherche produits */}
          <div ref={searchBoxRef} className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              className="input pl-10 pr-9"
              placeholder="Rechercher un produit : nom, référence, code-barres, catégorie…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowResults(true) }}
              onFocus={() => setShowResults(true)}
              onKeyDown={handleSearchKeyDown}
              autoComplete="off"
              role="combobox"
              aria-expanded={showResults && hasQuery}
              aria-controls="purchase-product-results"
            />
            {hasQuery && (
              <button type="button" onClick={() => { setSearch(''); searchRef.current?.focus() }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600" aria-label="Effacer la recherche">
                <X className="w-4 h-4" />
              </button>
            )}

            {showResults && hasQuery && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden">
                {results.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-neutral-500">Aucun produit ne correspond à « {search.trim()} ».</p>
                ) : (
                  <ul id="purchase-product-results" ref={resultsRef} role="listbox" className="max-h-72 overflow-y-auto py-1">
                    {results.map((p, i) => {
                      const inCart = lines.find((l) => l.product_id === p.id)
                      return (
                        <li
                          key={p.id}
                          role="option"
                          aria-selected={i === activeIdx}
                          onMouseDown={(e) => { e.preventDefault(); addProduct(p) }}
                          onMouseEnter={() => setActiveIdx(i)}
                          className={cn('flex items-center gap-3 px-4 py-2 cursor-pointer', i === activeIdx ? 'bg-primary-50' : 'hover:bg-neutral-50')}
                        >
                          <Package className="w-4 h-4 text-neutral-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 truncate">{p.name}</p>
                            <p className="text-xs text-neutral-500 truncate">
                              {p.sku}{p.category?.name ? ` · ${p.category.name}` : ''} · Stock : {stockMap[p.id] ?? 0}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm text-neutral-700">{formatXOF(p.purchase_price)}</p>
                            {inCart && <p className="text-xs text-primary-600">Déjà ajouté ({inCart.quantity})</p>}
                          </div>
                          <Plus className="w-4 h-4 text-primary-600 shrink-0" />
                        </li>
                      )
                    })}
                  </ul>
                )}
                {results.length === MAX_RESULTS && (
                  <p className="px-4 py-2 text-xs text-neutral-400 border-t border-neutral-100">Affinez la recherche pour voir plus de résultats.</p>
                )}
              </div>
            )}
          </div>

          {/* Lignes de l'achat */}
          {lines.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-neutral-200 rounded-lg text-neutral-500">
              <Package className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
              <p className="text-sm">Recherchez un produit ci-dessus pour l'ajouter à l'achat.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="hidden sm:flex gap-2 px-1 text-xs font-medium text-neutral-500">
                <span className="flex-1">Produit</span>
                <span className="w-20">Qté</span>
                <span className="w-28">Prix unitaire</span>
                <span className="w-24 text-right">Sous-total</span>
                <span className="w-8" />
              </div>
              {lines.map((line, idx) => {
                const product = productById.get(line.product_id)
                const subtotal = (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0)
                return (
                  <div
                    key={line.product_id}
                    className={cn('flex flex-wrap sm:flex-nowrap gap-2 items-center rounded-lg p-1 transition-colors duration-500', flashId === line.product_id && 'bg-primary-50')}
                  >
                    <div className="w-full sm:w-auto sm:flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{product?.name ?? 'Produit inconnu'}</p>
                      <p className="text-xs text-neutral-500 truncate">{product?.sku} · Stock actuel : {stockMap[line.product_id] ?? 0}</p>
                    </div>
                    <input type="number" min="1" placeholder="Qté" aria-label="Quantité" className="input w-20" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                    <input type="number" min="0" placeholder="Prix" aria-label="Prix unitaire" className="input w-28" value={line.unit_cost} onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)} />
                    <span className="flex-1 sm:flex-none sm:w-24 text-right text-sm font-medium text-neutral-700">{formatXOF(subtotal)}</span>
                    <button type="button" onClick={() => removeLine(idx)} className="text-neutral-400 hover:text-error-500 p-2" aria-label="Retirer l'article"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div><label className="label">Notes</label><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
          <div><p className="text-sm text-neutral-500">Total ({lines.length} article{lines.length > 1 ? 's' : ''})</p><p className="text-2xl font-bold text-neutral-900">{formatXOF(total)}</p></div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => navigate('/purchases')}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer</button>
          </div>
        </div>
        {error && <div className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg p-3">{error}</div>}
      </form>
    </div>
  )
}
