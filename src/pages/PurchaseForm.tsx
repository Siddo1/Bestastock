import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, Plus, Trash2, Package } from 'lucide-react'
import { supabase, Product, Supplier, Boutique } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAudit } from '../lib/audit'
import { PageHeader, Spinner } from '../components/ui'
import { formatXOF } from '../lib/utils'

type Line = { product_id: string; quantity: string; unit_cost: string }

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
  const [lines, setLines] = useState<Line[]>([{ product_id: '', quantity: '1', unit_cost: '' }])

  useEffect(() => {
    if (!canModify) { navigate('/purchases'); return }
    loadData()
  }, [])

  const loadData = async () => {
    const [s, p, b] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('boutiques').select('*').eq('is_active', true).order('name'),
    ])
    setSuppliers((s.data as Supplier[]) ?? [])
    setProducts((p.data as Product[]) ?? [])
    setBoutiques((b.data as Boutique[]) ?? [])
    setLoading(false)
  }

  const total = useMemo(() => {
    return lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0)
  }, [lines])

  const updateLine = (idx: number, field: keyof Line, value: string) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  const addLine = () => setLines([...lines, { product_id: '', quantity: '1', unit_cost: '' }])
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx))

  const handleProductSelect = (idx: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    updateLine(idx, 'product_id', productId)
    if (product && !lines[idx].unit_cost) updateLine(idx, 'unit_cost', String(product.purchase_price))
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
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Articles</label>
            <button type="button" onClick={addLine} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> Ajouter</button>
          </div>
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <select className="input flex-1" value={line.product_id} onChange={(e) => handleProductSelect(idx, e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <input type="number" min="1" placeholder="Qté" className="input w-20" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                <input type="number" min="0" placeholder="Prix" className="input w-28" value={line.unit_cost} onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)} />
                {lines.length > 1 && <button type="button" onClick={() => removeLine(idx)} className="text-neutral-400 hover:text-error-500 p-2"><Trash2 className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
        </div>

        <div><label className="label">Notes</label><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
          <div><p className="text-sm text-neutral-500">Total</p><p className="text-2xl font-bold text-neutral-900">{formatXOF(total)}</p></div>
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
