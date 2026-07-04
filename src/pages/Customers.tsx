import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users, Phone, Pencil, Eye } from 'lucide-react'
import { supabase, Customer } from '../lib/supabase'
import { PageHeader, Spinner, EmptyState } from '../components/ui'
import { formatXOF, formatDate } from '../lib/utils'

export default function Customers() {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [totals, setTotals] = useState<Record<string, number>>({})

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    setCustomers((data as Customer[]) ?? [])

    // Get total purchases per customer
    const { data: salesData } = await supabase.from('sales').select('customer_id, total_amount').eq('status', 'completed').not('customer_id', 'is', null)
    const t: Record<string, number> = {}
    ;(salesData ?? []).forEach((s: any) => {
      if (s.customer_id) t[s.customer_id] = (t[s.customer_id] ?? 0) + Number(s.total_amount)
    })
    setTotals(t)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        c.phone.includes(search)
      )
    })
  }, [customers, search])

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${customers.length} client${customers.length > 1 ? 's' : ''} enregistrés`}
        actions={<Link to="/customers/new" className="btn-primary"><Plus className="w-4 h-4" /> Nouveau client</Link>}
      />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400" />
          <input type="text" placeholder="Rechercher par nom ou téléphone…" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={<Users className="w-7 h-7" />} title="Aucun client" description="Ajoutez votre premier client." action={<Link to="/customers/new" className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</Link>} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const name = `${c.first_name} ${c.last_name}`.trim() || 'Client'
            const total = totals[c.id] ?? 0
            return (
              <Link key={c.id} to={`/customers/${c.id}`} className="card p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center font-semibold shrink-0">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 truncate group-hover:text-primary-600 transition-colors">{name}</p>
                    <p className="text-sm text-neutral-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5" /> {c.phone}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500">Total achats</p>
                    <p className="text-sm font-bold text-neutral-900">{formatXOF(total)}</p>
                  </div>
                  <p className="text-xs text-neutral-400">Depuis {formatDate(c.created_at)}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
