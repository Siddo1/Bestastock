import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Loader2, Search, Grid3x3, CheckCircle2 } from 'lucide-react'
import { supabase, Product, Boutique } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAudit } from '../lib/audit'
import { PageHeader, Spinner, EmptyState } from '../components/ui'
import { formatNumber } from '../lib/utils'

type Grid = Record<string, Record<string, string>> // [productId][boutiqueId] = qty

export default function StockAllocation() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [grid, setGrid] = useState<Grid>({})
  const [orig, setOrig] = useState<Grid>({})
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) { navigate('/stock'); return }
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const [p, b, s] = await Promise.all([
      supabase.from('products').select('id, name, sku').order('name'),
      supabase.from('boutiques').select('*').eq('is_active', true).order('name'),
      supabase.from('stock_items').select('product_id, boutique_id, quantity'),
    ])
    const prods = (p.data as Product[]) ?? []
    const bts = (b.data as Boutique[]) ?? []
    const stock = (s.data as { product_id: string; boutique_id: string; quantity: number }[]) ?? []

    const g: Grid = {}
    prods.forEach((pr) => {
      g[pr.id] = {}
      bts.forEach((bt) => { g[pr.id][bt.id] = '0' })
    })
    stock.forEach((st) => {
      if (g[st.product_id]) g[st.product_id][st.boutique_id] = String(st.quantity)
    })

    setProducts(prods)
    setBoutiques(bts)
    setGrid(g)
    setOrig(JSON.parse(JSON.stringify(g)))
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (!search) return products
    const q = search.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
  }, [products, search])

  const setCell = (productId: string, boutiqueId: string, value: string) => {
    setGrid((prev) => ({ ...prev, [productId]: { ...prev[productId], [boutiqueId]: value } }))
  }

  const dirtyCount = useMemo(() => {
    let n = 0
    for (const pid of Object.keys(grid)) {
      for (const bid of Object.keys(grid[pid] ?? {})) {
        if ((Number(grid[pid][bid]) || 0) !== (Number(orig[pid]?.[bid]) || 0)) n++
      }
    }
    return n
  }, [grid, orig])

  const boutiqueTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    boutiques.forEach((b) => {
      totals[b.id] = products.reduce((sum, p) => sum + (Number(grid[p.id]?.[b.id]) || 0), 0)
    })
    return totals
  }, [grid, products, boutiques])

  const save = async () => {
    setSaving(true)
    setNotice(null)
    let changes = 0
    for (const p of products) {
      for (const b of boutiques) {
        const target = Number(grid[p.id]?.[b.id]) || 0
        const before = Number(orig[p.id]?.[b.id]) || 0
        if (target === before) continue
        const { data: existing } = await supabase.from('stock_items').select('id').eq('product_id', p.id).eq('boutique_id', b.id).maybeSingle()
        if (existing) {
          await supabase.from('stock_items').update({ quantity: target, updated_at: new Date().toISOString() }).eq('id', existing.id)
        } else {
          await supabase.from('stock_items').insert({ product_id: p.id, boutique_id: b.id, quantity: target })
        }
        await supabase.from('stock_movements').insert({
          product_id: p.id,
          boutique_id: b.id,
          quantity: target - before,
          movement_type: 'adjustment',
          notes: 'Répartition (tableau central)',
          performed_by: profile?.id,
        })
        changes++
      }
    }
    await logAudit('stock_allocation', 'stock_items', null, null, { changes })
    setSaving(false)
    setNotice(`${changes} modification(s) enregistrée(s).`)
    load()
  }

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader
        title="Répartition du stock"
        subtitle="Gérez les quantités de chaque produit dans toutes les boutiques"
        actions={
          <button className="btn-primary" onClick={save} disabled={saving || dirtyCount === 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
          </button>
        }
      />

      {notice && (
        <div className="mb-4 text-sm text-success-700 bg-success-50 border border-success-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {notice}
        </div>
      )}

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400" />
          <input type="text" placeholder="Rechercher un produit…" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="card"><EmptyState icon={<Grid3x3 className="w-7 h-7" />} title="Aucun produit" description="Ajoutez d'abord des produits au catalogue." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 sticky left-0 bg-neutral-50">Produit</th>
                  {boutiques.map((b) => (
                    <th key={b.id} className="text-center text-xs font-semibold text-neutral-500 uppercase px-3 py-3 min-w-[110px]">{b.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="px-4 py-2 sticky left-0 bg-white">
                      <p className="text-sm font-medium text-neutral-900 whitespace-nowrap">{p.name}</p>
                      <p className="text-xs text-neutral-400 font-mono">{p.sku}</p>
                    </td>
                    {boutiques.map((b) => {
                      const changed = (Number(grid[p.id]?.[b.id]) || 0) !== (Number(orig[p.id]?.[b.id]) || 0)
                      return (
                        <td key={b.id} className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={grid[p.id]?.[b.id] ?? '0'}
                            onChange={(e) => setCell(p.id, b.id, e.target.value)}
                            className={`input text-center w-20 mx-auto ${changed ? 'border-primary-400 bg-primary-50' : ''}`}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-50 border-t-2 border-neutral-200">
                  <td className="px-4 py-3 text-sm font-semibold text-neutral-700 sticky left-0 bg-neutral-50">Total unités</td>
                  {boutiques.map((b) => (
                    <td key={b.id} className="px-3 py-3 text-center text-sm font-bold text-neutral-900">{formatNumber(boutiqueTotals[b.id] ?? 0)}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
