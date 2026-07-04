import { useEffect, useState, useMemo } from 'react'
import { Boxes, Search, AlertTriangle, TrendingDown, TrendingUp, Edit } from 'lucide-react'
import { supabase, StockItem, Boutique } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Spinner, EmptyState, Badge, Modal } from '../components/ui'
import { formatXOF, formatNumber } from '../lib/utils'
import { logAudit } from '../lib/audit'

export default function Stock() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const canModify = isAdmin || profile?.can_modify_stock
  const [loading, setLoading] = useState(true)
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [search, setSearch] = useState('')
  const [boutiqueFilter, setBoutiqueFilter] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null)
  const [newQty, setNewQty] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    let query = supabase.from('stock_items').select('*, product:products(*), boutique:boutiques(*)').order('updated_at', { ascending: false })
    if (!isAdmin && profile?.boutique_id) {
      query = query.eq('boutique_id', profile.boutique_id)
    }
    const { data } = await query
    setStockItems((data as StockItem[]) ?? [])

    const { data: bData } = await supabase.from('boutiques').select('*').eq('is_active', true).order('name')
    setBoutiques((bData as Boutique[]) ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return stockItems.filter((s) => {
      const matchSearch = !search || s.product?.name.toLowerCase().includes(search.toLowerCase()) || s.product?.sku.toLowerCase().includes(search.toLowerCase())
      const matchBoutique = !boutiqueFilter || s.boutique_id === boutiqueFilter
      const matchLow = !lowOnly || s.quantity <= s.reorder_threshold
      return matchSearch && matchBoutique && matchLow
    })
  }, [stockItems, search, boutiqueFilter, lowOnly])

  const totalValue = useMemo(() => {
    return filtered.reduce((sum, s) => sum + s.quantity * Number(s.product?.purchase_price ?? 0), 0)
  }, [filtered])

  const totalQty = useMemo(() => filtered.reduce((sum, s) => sum + s.quantity, 0), [filtered])

  const openAdjust = (item: StockItem) => {
    setAdjustItem(item)
    setNewQty(String(item.quantity))
    setAdjustReason('')
  }

  const handleAdjust = async () => {
    if (!adjustItem) return
    setSaving(true)
    const targetQty = Number(newQty)
    const diff = targetQty - adjustItem.quantity

    const { data: old } = await supabase.from('stock_items').select('*').eq('id', adjustItem.id).maybeSingle()

    await supabase.from('stock_items').update({ quantity: targetQty, updated_at: new Date().toISOString() }).eq('id', adjustItem.id)

    await supabase.from('stock_movements').insert({
      product_id: adjustItem.product_id,
      boutique_id: adjustItem.boutique_id,
      quantity: diff,
      movement_type: 'adjustment',
      notes: adjustReason || 'Ajustage manuel',
      performed_by: profile?.id,
    })

    await logAudit('adjust_stock', 'stock_items', adjustItem.id, old, { ...old, quantity: targetQty })
    setSaving(false)
    setAdjustItem(null)
    load()
  }

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader
        title="Stock"
        subtitle={`${formatNumber(totalQty)} unités — Valeur: ${formatXOF(totalValue)}`}
      />

      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400" />
            <input type="text" placeholder="Rechercher un produit…" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
          </div>
          {isAdmin && (
            <select value={boutiqueFilter} onChange={(e) => setBoutiqueFilter(e.target.value)} className="input sm:w-48">
              <option value="">Toutes boutiques</option>
              {boutiques.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button
            className={`btn ${lowOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setLowOnly(!lowOnly)}
          >
            <AlertTriangle className="w-4 h-4" /> Stock bas
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={<Boxes className="w-7 h-7" />} title="Aucun stock" description="Aucun article ne correspond à vos filtres." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Produit</th>
                  {isAdmin && <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden md:table-cell">Boutique</th>}
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Quantité</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden sm:table-cell">Seuil</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden lg:table-cell">Valeur</th>
                  <th className="text-center text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Statut</th>
                  {canModify && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((s) => {
                  const value = s.quantity * Number(s.product?.purchase_price ?? 0)
                  const isLow = s.quantity <= s.reorder_threshold
                  const isOut = s.quantity === 0
                  return (
                    <tr key={s.id} className="table-row">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-neutral-900">{s.product?.name}</p>
                        <p className="text-xs text-neutral-500 font-mono">{s.product?.sku}</p>
                      </td>
                      {isAdmin && <td className="px-4 py-3 hidden md:table-cell text-sm text-neutral-600">{s.boutique?.name}</td>}
                      <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">{formatNumber(s.quantity)}</td>
                      <td className="px-4 py-3 text-right text-sm text-neutral-500 hidden sm:table-cell">{s.reorder_threshold}</td>
                      <td className="px-4 py-3 text-right text-sm text-neutral-600 hidden lg:table-cell">{formatXOF(value)}</td>
                      <td className="px-4 py-3 text-center">
                        {isOut ? <Badge variant="error">Rupture</Badge> : isLow ? <Badge variant="warning">Bas</Badge> : <Badge variant="success">OK</Badge>}
                      </td>
                      {canModify && (
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openAdjust(s)} className="text-neutral-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-primary-50">
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!adjustItem} onClose={() => setAdjustItem(null)} title="Ajuster le stock">
        {adjustItem && (
          <div className="space-y-4">
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-sm font-medium text-neutral-900">{adjustItem.product?.name}</p>
              <p className="text-xs text-neutral-500">{adjustItem.boutique?.name} • Stock actuel: {adjustItem.quantity}</p>
            </div>
            <div>
              <label className="label">Nouvelle quantité</label>
              <input type="number" min="0" className="input" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
            </div>
            <div>
              <label className="label">Raison (optionnel)</label>
              <input className="input" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Casse, perte, inventaire…" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setAdjustItem(null)}>Annuler</button>
              <button className="btn-primary" onClick={handleAdjust} disabled={saving}>
                {saving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
