import { useEffect, useState, useMemo } from 'react'
import { Download, FileBarChart, Calendar, TrendingUp, Package, Users, DollarSign } from 'lucide-react'
import { supabase, Sale, StockItem, Customer } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Spinner, StatCard, EmptyState } from '../components/ui'
import { formatXOF, formatNumber, formatDate } from '../lib/utils'

type Period = 'today' | 'week' | 'month' | 'year'

export default function Reports() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [sales, setSales] = useState<Sale[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => { load() }, [period])

  const load = async () => {
    setLoading(true)
    const now = new Date()
    let start = new Date()
    if (period === 'today') start.setHours(0, 0, 0, 0)
    else if (period === 'week') start.setDate(now.getDate() - 7)
    else if (period === 'month') start.setMonth(now.getMonth(), 1)
    else if (period === 'year') start.setFullYear(now.getFullYear(), 0, 1)

    let sQuery = supabase.from('sales').select('*, customer:customers(*), boutique:boutiques(*), sale_items:sale_items(*, product:products(*))').gte('created_at', start.toISOString()).eq('status', 'completed').order('created_at', { ascending: false })
    if (!isAdmin && profile?.boutique_id) sQuery = sQuery.eq('boutique_id', profile.boutique_id)
    let stQuery = supabase.from('stock_items').select('*, product:products(*), boutique:boutiques(*)')
    if (!isAdmin && profile?.boutique_id) stQuery = stQuery.eq('boutique_id', profile.boutique_id)

    const [s, st, c] = await Promise.all([sQuery, stQuery, supabase.from('customers').select('*')])
    setSales((s.data as Sale[]) ?? [])
    setStockItems((st.data as StockItem[]) ?? [])
    setCustomers((c.data as Customer[]) ?? [])
    setLoading(false)
  }

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0)
    const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount), 0)
    const stockValue = stockItems.reduce((sum, s) => sum + s.quantity * Number(s.product?.purchase_price ?? 0), 0)
    const stockQty = stockItems.reduce((sum, s) => sum + s.quantity, 0)
    const avgBasket = sales.length > 0 ? totalRevenue / sales.length : 0
    return { totalRevenue, totalDiscount, stockValue, stockQty, avgBasket, salesCount: sales.length }
  }, [sales, stockItems])

  const exportCSV = (type: 'sales' | 'stock' | 'customers') => {
    let rows: Record<string, unknown>[] = []
    let filename = ''
    if (type === 'sales') {
      rows = sales.map((s) => ({
        Date: s.created_at, ID: s.id, Client: s.customer ? `${s.customer.first_name} ${s.customer.last_name}` : 'Anonyme',
        Boutique: s.boutique?.name ?? '', Articles: s.sale_items?.length ?? 0, Remise: s.discount, Total: s.total_amount, Paiement: s.payment_method,
      }))
      filename = 'ventes'
    } else if (type === 'stock') {
      rows = stockItems.map((s) => ({
        Produit: s.product?.name, SKU: s.product?.sku, Boutique: s.boutique?.name, Quantite: s.quantity, Seuil: s.reorder_threshold,
        Prix_achat: s.product?.purchase_price, Valeur: s.quantity * Number(s.product?.purchase_price ?? 0),
      }))
      filename = 'stock'
    } else {
      rows = customers.map((c) => ({ Nom: c.last_name, Prenom: c.first_name, Telephone: c.phone, Email: c.email ?? '', Adresse: c.address ?? '', Cree_le: c.created_at }))
      filename = 'clients'
    }
    if (rows.length === 0) return
    const headers = Object.keys(rows[0])
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${formatDate(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader title="Rapports" subtitle={isAdmin ? 'Vue consolidée toutes boutiques' : 'Vue de votre boutique'} />

      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { v: 'today', l: "Aujourd'hui" },
          { v: 'week', l: '7 jours' },
          { v: 'month', l: 'Ce mois' },
          { v: 'year', l: 'Cette année' },
        ] as { v: Period; l: string }[]).map((p) => (
          <button key={p.v} onClick={() => setPeriod(p.v)} className={`btn ${period === p.v ? 'btn-primary' : 'btn-secondary'}`}>{p.l}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Chiffre d'affaires" value={formatXOF(stats.totalRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="success" />
        <StatCard label="Nombre de ventes" value={formatNumber(stats.salesCount)} icon={<DollarSign className="w-5 h-5" />} color="primary" />
        <StatCard label="Panier moyen" value={formatXOF(stats.avgBasket)} icon={<Calendar className="w-5 h-5" />} color="accent" />
        <StatCard label="Valeur du stock" value={formatXOF(stats.stockValue)} icon={<Package className="w-5 h-5" />} color="warning" trend={`${formatNumber(stats.stockQty)} unités`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {[
          { type: 'sales' as const, label: 'Export ventes (CSV)', icon: TrendingUp, color: 'text-success-600 bg-success-50' },
          { type: 'stock' as const, label: 'Export stock (CSV)', icon: Package, color: 'text-primary-600 bg-primary-50' },
          { type: 'customers' as const, label: 'Export clients (CSV)', icon: Users, color: 'text-accent-600 bg-accent-50' },
        ].map((e) => (
          <button key={e.type} onClick={() => exportCSV(e.type)} className="card p-5 text-left hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${e.color}`}><e.icon className="w-5 h-5" /></div>
              <div className="flex-1">
                <p className="font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors">{e.label}</p>
                <p className="text-xs text-neutral-500">Télécharger au format CSV</p>
              </div>
              <Download className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 transition-colors" />
            </div>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="font-semibold text-neutral-900">Détail des ventes</h3>
        </div>
        {sales.length === 0 ? (
          <EmptyState icon={<FileBarChart className="w-6 h-6" />} title="Aucune vente sur cette période" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden sm:table-cell">Client</th>
                  {isAdmin && <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden md:table-cell">Boutique</th>}
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden sm:table-cell">Articles</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sales.slice(0, 50).map((s) => (
                  <tr key={s.id} className="table-row">
                    <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">{formatDate(s.created_at)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-neutral-900">{s.customer ? `${s.customer.first_name} ${s.customer.last_name}`.trim() : 'Anonyme'}</td>
                    {isAdmin && <td className="px-4 py-3 hidden md:table-cell text-sm text-neutral-600">{s.boutique?.name}</td>}
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-neutral-600">{s.sale_items?.length ?? 0}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">{formatXOF(Number(s.total_amount))}</td>
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
