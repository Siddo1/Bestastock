import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { supabase, Product, Boutique } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAudit } from '../lib/audit'
import { PageHeader, Spinner } from '../components/ui'

type Line = { product_id: string; quantity: string }

export default function TransferForm() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [fromBoutique, setFromBoutique] = useState('')
  const [toBoutique, setToBoutique] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([{ product_id: '', quantity: '1' }])

  useEffect(() => {
    if (profile?.role !== 'admin') { navigate('/transfers'); return }
    loadData()
  }, [])

  const loadData = async () => {
    const [p, b] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('boutiques').select('*').eq('is_active', true).order('name'),
    ])
    setProducts((p.data as Product[]) ?? [])
    setBoutiques((b.data as Boutique[]) ?? [])
    setLoading(false)
  }

  const updateLine = (idx: number, field: keyof Line, value: string) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }
  const addLine = () => setLines([...lines, { product_id: '', quantity: '1' }])
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!fromBoutique || !toBoutique) { setError('Sélectionnez les boutiques source et destination.'); return }
    if (fromBoutique === toBoutique) { setError('Les boutiques source et destination doivent être différentes.'); return }
    const validLines = lines.filter((l) => l.product_id && Number(l.quantity) > 0)
    if (validLines.length === 0) { setError('Ajoutez au moins un article.'); return }

    setSaving(true)
    for (const line of validLines) {
      const qty = Number(line.quantity)
      const { data: transfer, error: tErr } = await supabase.from('stock_transfers').insert({
        product_id: line.product_id,
        from_boutique_id: fromBoutique,
        to_boutique_id: toBoutique,
        quantity: qty,
        status: 'completed',
        notes: notes.trim() || null,
        performed_by: profile?.id,
      }).select().single()
      if (tErr) { setError(tErr.message); setSaving(false); return }

      // Decrement source stock
      const { data: fromStock } = await supabase.from('stock_items').select('*').eq('product_id', line.product_id).eq('boutique_id', fromBoutique).maybeSingle()
      if (fromStock) {
        await supabase.from('stock_items').update({ quantity: Math.max(0, fromStock.quantity - qty), updated_at: new Date().toISOString() }).eq('id', fromStock.id)
        await supabase.from('stock_movements').insert({ product_id: line.product_id, boutique_id: fromBoutique, quantity: -qty, movement_type: 'transfer_out', reference_id: transfer.id, notes: `Transfert vers ${toBoutique}`, performed_by: profile?.id })
      }

      // Increment dest stock
      const { data: toStock } = await supabase.from('stock_items').select('*').eq('product_id', line.product_id).eq('boutique_id', toBoutique).maybeSingle()
      if (toStock) {
        await supabase.from('stock_items').update({ quantity: toStock.quantity + qty, updated_at: new Date().toISOString() }).eq('id', toStock.id)
      } else {
        await supabase.from('stock_items').insert({ product_id: line.product_id, boutique_id: toBoutique, quantity: qty })
      }
      await supabase.from('stock_movements').insert({ product_id: line.product_id, boutique_id: toBoutique, quantity: qty, movement_type: 'transfer_in', reference_id: transfer.id, notes: `Transfert depuis ${fromBoutique}`, performed_by: profile?.id })

      await logAudit('create_transfer', 'stock_transfers', transfer.id, null, { fromBoutique, toBoutique, qty })
    }

    setSaving(false)
    navigate('/transfers')
  }

  if (loading) return <Spinner lg />

  return (
    <div className="max-w-3xl">
      <PageHeader title="Nouveau transfert" actions={<button onClick={() => navigate('/transfers')} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Retour</button>} />
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Boutique source *</label>
            <select className="input" value={fromBoutique} onChange={(e) => setFromBoutique(e.target.value)}>
              <option value="">Sélectionner…</option>
              {boutiques.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Boutique destination *</label>
            <select className="input" value={toBoutique} onChange={(e) => setToBoutique(e.target.value)}>
              <option value="">Sélectionner…</option>
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
                <select className="input flex-1" value={line.product_id} onChange={(e) => updateLine(idx, 'product_id', e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <input type="number" min="1" placeholder="Qté" className="input w-24" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                {lines.length > 1 && <button type="button" onClick={() => removeLine(idx)} className="text-neutral-400 hover:text-error-500 p-2"><Trash2 className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
        </div>

        <div><label className="label">Notes</label><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        {error && <div className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg p-3">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/transfers')}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Transférer</button>
        </div>
      </form>
    </div>
  )
}
