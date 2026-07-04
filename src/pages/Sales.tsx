import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, Search, Eye } from 'lucide-react'
import { supabase, Sale } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui'
import { formatXOF, formatDateTime } from '../lib/utils'

export default function Sales() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState<Sale[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    let q = supabase.from('sales').select('*, customer:customers(*), boutique:boutiques(*), sale_items:sale_items(*)').order('created_at', { ascending: false })
    if (!isAdmin && profile?.boutique_id) q = q.eq('boutique_id', profile.boutique_id)
    const { data } = await q
    setSales((data as Sale[]) ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (!search) return true
      const q = search.toLowerCase()
      const name = s.customer ? `${s.customer.first_name} ${s.customer.last_name}`.toLowerCase() : ''
      return name.includes(q) || s.id.includes(search)
    })
  }, [sales, search])

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader title="Ventes" subtitle={`${sales.length} vente${sales.length > 1 ? 's' : ''} enregistrée${sales.length > 1 ? 's' : ''}`} />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400" />
          <input type="text" placeholder="Rechercher par client ou ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={<Receipt className="w-7 h-7" />} title="Aucune vente" description="Les ventes apparaîtront ici." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden sm:table-cell">Client</th>
                  {isAdmin && <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden md:table-cell">Boutique</th>}
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden sm:table-cell">Articles</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Paiement</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Montant</th>
                  <th className="text-center text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="table-row">
                    <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">{formatDateTime(s.created_at)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-neutral-900">
                      {s.customer ? `${s.customer.first_name} ${s.customer.last_name}`.trim() : <span className="text-neutral-400">Anonyme</span>}
                    </td>
                    {isAdmin && <td className="px-4 py-3 hidden md:table-cell text-sm text-neutral-600">{s.boutique?.name}</td>}
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-neutral-600">{s.sale_items?.length ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600 capitalize">{s.payment_method === 'cash' ? 'Espèces' : s.payment_method === 'mobile_money' ? 'Mobile Money' : s.payment_method === 'card' ? 'Carte' : s.payment_method}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">{formatXOF(Number(s.total_amount))}</td>
                    <td className="px-4 py-3 text-center"><Badge variant={s.status === 'completed' ? 'success' : s.status === 'cancelled' ? 'error' : 'warning'}>{s.status === 'completed' ? 'Terminée' : s.status === 'cancelled' ? 'Annulée' : 'En attente'}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/sales/${s.id}`} className="text-neutral-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-primary-50"><Eye className="w-4 h-4" /></Link>
                    </td>
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
