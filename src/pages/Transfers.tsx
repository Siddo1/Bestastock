import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ArrowLeftRight, Search } from 'lucide-react'
import { supabase, StockTransfer } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui'
import { formatDateTime } from '../lib/utils'

export default function Transfers() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('stock_transfers')
      .select('*, product:products(*), from_boutique:boutiques!stock_transfers_from_boutique_id_fkey(*), to_boutique:boutiques!stock_transfers_to_boutique_id_fkey(*)')
      .order('created_at', { ascending: false })
    setTransfers((data as StockTransfer[]) ?? [])
    setLoading(false)
  }

  const filtered = transfers.filter((t) => {
    if (!search) return true
    return (t.product?.name ?? '').toLowerCase().includes(search.toLowerCase())
  })

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader
        title="Transferts inter-boutiques"
        subtitle={`${transfers.length} transfert${transfers.length > 1 ? 's' : ''}`}
        actions={isAdmin && <Link to="/transfers/new" className="btn-primary"><Plus className="w-4 h-4" /> Nouveau transfert</Link>}
      />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400" />
          <input type="text" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={<ArrowLeftRight className="w-7 h-7" />} title="Aucun transfert" description="Les transferts entre boutiques apparaîtront ici." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Produit</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">De → Vers</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Quantité</th>
                  <th className="text-center text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="table-row">
                    <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">{formatDateTime(t.created_at)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-900">{t.product?.name}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{t.from_boutique?.name} → {t.to_boutique?.name}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">{t.quantity}</td>
                    <td className="px-4 py-3 text-center"><Badge variant={t.status === 'completed' ? 'success' : t.status === 'cancelled' ? 'error' : 'warning'}>{t.status === 'completed' ? 'Terminé' : t.status === 'cancelled' ? 'Annulé' : 'En attente'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
