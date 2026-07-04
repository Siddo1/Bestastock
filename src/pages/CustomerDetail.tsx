import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Phone, Mail, MapPin, ShoppingBag, Calendar, TrendingUp } from 'lucide-react'
import { supabase, Customer, Sale } from '../lib/supabase'
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui'
import { formatXOF, formatDate, formatDateTime } from '../lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [sales, setSales] = useState<Sale[]>([])

  useEffect(() => { load() }, [id])

  const load = async () => {
    if (!id) return
    const { data: c } = await supabase.from('customers').select('*').eq('id', id).maybeSingle()
    setCustomer(c as Customer | null)
    const { data: s } = await supabase.from('sales').select('*, sale_items:sale_items(*, product:products(*))').eq('customer_id', id).order('created_at', { ascending: false })
    setSales((s as Sale[]) ?? [])
    setLoading(false)
  }

  const stats = useMemo(() => {
    const completed = sales.filter((s) => s.status === 'completed')
    const total = completed.reduce((sum, s) => sum + Number(s.total_amount), 0)
    const count = completed.length
    const avg = count > 0 ? total / count : 0
    const lastDate = completed[0]?.created_at
    return { total, count, avg, lastDate }
  }, [sales])

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {}
    sales.filter((s) => s.status === 'completed').forEach((s) => {
      const d = new Date(s.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map[key] = (map[key] ?? 0) + Number(s.total_amount)
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([k, v]) => {
        const [y, m] = k.split('-')
        return { month: new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-FR', { month: 'short' }), total: v }
      })
  }, [sales])

  if (loading) return <Spinner lg />
  if (!customer) return <EmptyState title="Client introuvable" />

  const name = `${customer.first_name} ${customer.last_name}`.trim() || 'Client'

  return (
    <div>
      <PageHeader
        title={name}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/customers')} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Retour</button>
            <Link to={`/customers/${id}/edit`} className="btn-primary"><Pencil className="w-4 h-4" /> Modifier</Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xl font-bold">
              {name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-neutral-900">{name}</p>
              <p className="text-xs text-neutral-500">Client depuis {formatDate(customer.created_at)}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-sm text-neutral-600">
              <Phone className="w-4 h-4 text-neutral-400" /> {customer.phone}
            </div>
            {customer.email && <div className="flex items-center gap-2.5 text-sm text-neutral-600"><Mail className="w-4 h-4 text-neutral-400" /> {customer.email}</div>}
            {customer.address && <div className="flex items-center gap-2.5 text-sm text-neutral-600"><MapPin className="w-4 h-4 text-neutral-400" /> {customer.address}</div>}
            {customer.notes && <div className="pt-3 border-t border-neutral-100"><p className="text-xs text-neutral-500 mb-1">Notes</p><p className="text-sm text-neutral-700">{customer.notes}</p></div>}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 text-neutral-500 mb-2"><TrendingUp className="w-4 h-4" /><span className="text-xs font-medium">Total achats</span></div>
            <p className="text-2xl font-bold text-neutral-900">{formatXOF(stats.total)}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 text-neutral-500 mb-2"><ShoppingBag className="w-4 h-4" /><span className="text-xs font-medium">Nombre d'achats</span></div>
            <p className="text-2xl font-bold text-neutral-900">{stats.count}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 text-neutral-500 mb-2"><Calendar className="w-4 h-4" /><span className="text-xs font-medium">Panier moyen</span></div>
            <p className="text-2xl font-bold text-neutral-900">{formatXOF(stats.avg)}</p>
          </div>
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Évolution des achats (6 derniers mois)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [formatXOF(v), 'Achats']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              <Bar dataKey="total" fill="#33a4ff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="font-semibold text-neutral-900">Historique des achats</h3>
        </div>
        {sales.length === 0 ? (
          <EmptyState icon={<ShoppingBag className="w-6 h-6" />} title="Aucun achat" description="Ce client n'a pas encore effectué d'achat." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden sm:table-cell">Articles</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Paiement</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Montant</th>
                  <th className="text-center text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sales.map((s) => (
                  <tr key={s.id} className="table-row">
                    <td className="px-4 py-3 text-sm text-neutral-600">{formatDateTime(s.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600 hidden sm:table-cell">{s.sale_items?.length ?? 0} article(s)</td>
                    <td className="px-4 py-3 text-sm text-neutral-600 capitalize">{s.payment_method === 'cash' ? 'Espèces' : s.payment_method === 'mobile_money' ? 'Mobile Money' : s.payment_method === 'card' ? 'Carte' : s.payment_method}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">{formatXOF(Number(s.total_amount))}</td>
                    <td className="px-4 py-3 text-center"><Badge variant={s.status === 'completed' ? 'success' : s.status === 'cancelled' ? 'error' : 'warning'}>{s.status === 'completed' ? 'Terminée' : s.status === 'cancelled' ? 'Annulée' : 'En attente'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
