import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Truck, Phone, Mail, Pencil, Package } from 'lucide-react'
import { supabase, Supplier } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Spinner, EmptyState } from '../components/ui'
import { formatXOF } from '../lib/utils'

export default function Suppliers() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [purchaseTotals, setPurchaseTotals] = useState<Record<string, number>>({})

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const [sRes, pRes] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('purchases').select('supplier_id, total_amount'),
    ])
    setSuppliers((sRes.data as Supplier[]) ?? [])
    const t: Record<string, number> = {}
    ;((pRes.data as any[]) ?? []).forEach((p) => {
      if (p.supplier_id) t[p.supplier_id] = (t[p.supplier_id] ?? 0) + Number(p.total_amount)
    })
    setPurchaseTotals(t)
    setLoading(false)
  }

  const filtered = suppliers.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) || (s.contact_name ?? '').toLowerCase().includes(q) || (s.phone ?? '').includes(search)
  })

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader
        title="Fournisseurs"
        subtitle={`${suppliers.length} fournisseur${suppliers.length > 1 ? 's' : ''}`}
        actions={isAdmin && <Link to="/suppliers/new" className="btn-primary"><Plus className="w-4 h-4" /> Nouveau fournisseur</Link>}
      />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400" />
          <input type="text" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={<Truck className="w-7 h-7" />} title="Aucun fournisseur" description="Ajoutez vos fournisseurs pour suivre les achats." /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center"><Truck className="w-5 h-5" /></div>
                  <div>
                    <p className="font-semibold text-neutral-900">{s.name}</p>
                    {s.contact_name && <p className="text-xs text-neutral-500">{s.contact_name}</p>}
                  </div>
                </div>
                {isAdmin && <Link to={`/suppliers/${s.id}/edit`} className="text-neutral-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-primary-50"><Pencil className="w-4 h-4" /></Link>}
              </div>
              <div className="space-y-1.5 text-sm text-neutral-600">
                {s.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-neutral-400" /> {s.phone}</div>}
                {s.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-neutral-400" /> {s.email}</div>}
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-500">Total achats</p>
                  <p className="text-sm font-bold text-neutral-900">{formatXOF(purchaseTotals[s.id] ?? 0)}</p>
                </div>
                <Link to={`/purchases/new?supplier=${s.id}`} className="text-xs text-primary-600 hover:text-primary-700 font-medium">+ Achat</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
