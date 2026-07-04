import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Package, Search } from 'lucide-react'
import { supabase, Purchase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui'
import { formatXOF, formatDateTime } from '../lib/utils'

export default function Purchases() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const canModify = isAdmin || profile?.can_modify_stock
  const [loading, setLoading] = useState(true)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    let q = supabase.from('purchases').select('*, supplier:suppliers(*), boutique:boutiques(*), purchase_items:purchase_items(*)').order('created_at', { ascending: false })
    if (!isAdmin && profile?.boutique_id) q = q.eq('boutique_id', profile.boutique_id)
    const { data } = await q
    setPurchases((data as Purchase[]) ?? [])
    setLoading(false)
  }

  const filtered = purchases.filter((p) => {
    if (!search) return true
    return (p.supplier?.name ?? '').toLowerCase().includes(search.toLowerCase())
  })

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader
        title="Achats"
        subtitle={`${purchases.length} achat${purchases.length > 1 ? 's' : ''} fournisseur`}
        actions={canModify && <Link to="/purchases/new" className="btn-primary"><Plus className="w-4 h-4" /> Nouvel achat</Link>}
      />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400" />
          <input type="text" placeholder="Rechercher par fournisseur…" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={<Package className="w-7 h-7" />} title="Aucun achat" description="Enregistrez vos achats fournisseurs pour alimenter le stock." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Fournisseur</th>
                  {isAdmin && <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden md:table-cell">Boutique</th>}
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden sm:table-cell">Articles</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">{formatDateTime(p.purchased_at)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-900">{p.supplier?.name ?? '—'}</td>
                    {isAdmin && <td className="px-4 py-3 hidden md:table-cell text-sm text-neutral-600">{p.boutique?.name}</td>}
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-neutral-600">{p.purchase_items?.length ?? 0}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">{formatXOF(Number(p.total_amount))}</td>
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
