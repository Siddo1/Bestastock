import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowUpRight, Boxes, CalendarDays, CircleDollarSign,
  Package, ShoppingCart, TrendingUp, Users,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { supabase, Sale, StockItem } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Badge, EmptyState, PageHeader, Spinner, StatCard } from '../components/ui'
import { formatNumber, formatXOF } from '../lib/utils'

const PIE_COLORS = ['#315fc9', '#159784', '#7c5ce0', '#e8a11d', '#df5b64', '#4b9eea', '#6b7a99']

export default function Dashboard() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [todaySales, setTodaySales] = useState<Sale[]>([])
  const [monthSales, setMonthSales] = useState<Sale[]>([])
  const [topCustomers, setTopCustomers] = useState<Array<{ name: string; total: number; count: number }>>([])
  const [topProducts, setTopProducts] = useState<Array<{ name: string; quantity: number; revenue: number }>>([])
  const [boutiqueSales, setBoutiqueSales] = useState<Array<{ name: string; total: number }>>([])

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    setLoading(true)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const [stockRes, todaySalesRes, monthSalesRes] = await Promise.all([
      supabase.from('stock_items').select('*, product:products(*, category:categories(*)), boutique:boutiques(*)'),
      supabase.from('sales').select('*, customer:customers(*), boutique:boutiques(*)').gte('created_at', today.toISOString()).eq('status', 'completed'),
      supabase.from('sales').select('*, customer:customers(*), boutique:boutiques(*), sale_items:sale_items(*, product:products(*))').gte('created_at', monthStart.toISOString()).eq('status', 'completed'),
    ])
    const sales = (monthSalesRes.data as Sale[]) ?? []
    setStockItems((stockRes.data as StockItem[]) ?? [])
    setTodaySales((todaySalesRes.data as Sale[]) ?? [])
    setMonthSales(sales)

    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
    const customerMap: Record<string, { name: string; total: number; count: number }> = {}
    const storeMap: Record<string, { name: string; total: number }> = {}
    sales.forEach((sale) => {
      sale.sale_items?.forEach((item) => {
        if (!productMap[item.product_id]) productMap[item.product_id] = { name: item.product?.name ?? 'Produit inconnu', quantity: 0, revenue: 0 }
        productMap[item.product_id].quantity += item.quantity
        productMap[item.product_id].revenue += item.quantity * item.unit_price - item.discount
      })
      if (sale.customer_id) {
        const name = sale.customer ? `${sale.customer.first_name} ${sale.customer.last_name}`.trim() : 'Client inconnu'
        if (!customerMap[sale.customer_id]) customerMap[sale.customer_id] = { name, total: 0, count: 0 }
        customerMap[sale.customer_id].total += Number(sale.total_amount)
        customerMap[sale.customer_id].count += 1
      }
      if (sale.boutique) {
        if (!storeMap[sale.boutique.id]) storeMap[sale.boutique.id] = { name: sale.boutique.name, total: 0 }
        storeMap[sale.boutique.id].total += Number(sale.total_amount)
      }
    })
    setTopProducts(Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5))
    setTopCustomers(Object.values(customerMap).sort((a, b) => b.total - a.total).slice(0, 5))
    setBoutiqueSales(Object.values(storeMap))
    setLoading(false)
  }

  const stats = useMemo(() => {
    const stockValue = stockItems.reduce((sum, item) => sum + item.quantity * Number(item.product?.purchase_price ?? 0), 0)
    const stockQty = stockItems.reduce((sum, item) => sum + item.quantity, 0)
    const lowStock = stockItems.filter((item) => item.quantity <= item.reorder_threshold)
    const todayRevenue = todaySales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
    const monthRevenue = monthSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
    return { stockValue, stockQty, lowStock, todayRevenue, monthRevenue, todayCount: todaySales.length }
  }, [stockItems, todaySales, monthSales])

  const dailyChart = useMemo(() => {
    const days: Array<{ day: string; ventes: number }> = []
    for (let index = 6; index >= 0; index--) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - index)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      const total = monthSales
        .filter((sale) => { const date = new Date(sale.created_at); return date >= start && date < end })
        .reduce((sum, sale) => sum + Number(sale.total_amount), 0)
      days.push({ day: start.toLocaleDateString('fr-FR', { weekday: 'short' }), ventes: total })
    }
    return days
  }, [monthSales])

  const categoryChart = useMemo(() => {
    const categories: Record<string, number> = {}
    stockItems.forEach((item) => {
      const category = item.product?.category?.name ?? 'Sans catÃ©gorie'
      categories[category] = (categories[category] ?? 0) + item.quantity * Number(item.product?.purchase_price ?? 0)
    })
    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7)
  }, [stockItems])

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle={isAdmin ? 'Suivez votre activitÃ© commerciale, votre stock et vos prioritÃ©s.' : 'Vue opÃ©rationnelle de votre boutique.'}
        actions={<button className="btn-secondary text-xs"><CalendarDays className="w-4 h-4" /> Ce mois-ci</button>}
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Valeur du stock" value={formatXOF(stats.stockValue)} icon={<CircleDollarSign className="w-5 h-5" />} color="primary" trend={`${formatNumber(stats.stockQty)} unitÃ©s disponibles`} />
        <StatCard label="Chiffre dâ€™affaires du jour" value={formatXOF(stats.todayRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="success" trend={`${stats.todayCount} vente${stats.todayCount > 1 ? 's' : ''} aujourdâ€™hui`} trendUp />
        <StatCard label="Chiffre dâ€™affaires mensuel" value={formatXOF(stats.monthRevenue)} icon={<ShoppingCart className="w-5 h-5" />} color="accent" trend="Ventes finalisÃ©es ce mois" />
        <StatCard label="Produits Ã  rÃ©approvisionner" value={formatNumber(stats.lowStock.length)} icon={<AlertTriangle className="w-5 h-5" />} color={stats.lowStock.length > 0 ? 'warning' : 'success'} trend={stats.lowStock.length > 0 ? 'Action recommandÃ©e' : 'Stock sous contrÃ´le'} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-start justify-between mb-5">
            <div><p className="section-eyebrow">Performance</p><h2 className="font-semibold text-neutral-900 mt-1">Ventes des 7 derniers jours</h2></div>
            <span className="text-xs font-medium text-success-700 bg-success-50 rounded-md px-2.5 py-1">ActivitÃ© rÃ©cente</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => [formatXOF(value), 'Ventes']} contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)' }} />
              <Bar dataKey="ventes" fill="#315fc9" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="mb-3"><p className="section-eyebrow">RÃ©partition</p><h2 className="font-semibold text-neutral-900 mt-1">{isAdmin && boutiqueSales.length > 0 ? 'Ventes par boutique' : 'Valeur par catÃ©gorie'}</h2></div>
          {((isAdmin && boutiqueSales.length > 0) || categoryChart.length > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={isAdmin && boutiqueSales.length > 0 ? boutiqueSales : categoryChart} dataKey={isAdmin && boutiqueSales.length > 0 ? 'total' : 'value'} nameKey="name" cx="50%" cy="45%" outerRadius={88} innerRadius={52} paddingAngle={3}>
                  {(isAdmin && boutiqueSales.length > 0 ? boutiqueSales : categoryChart).map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatXOF(value)} contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={<Boxes className="w-6 h-6" />} title="Aucune donnÃ©e" />}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4"><div><p className="section-eyebrow">Ã€ traiter</p><h2 className="font-semibold text-neutral-900 mt-1">Stock bas</h2></div><Link to="/stock" className="text-xs text-primary-700 hover:text-primary-800 font-semibold flex items-center gap-1">Voir tout <ArrowUpRight className="w-3 h-3" /></Link></div>
          {stats.lowStock.length === 0 ? <EmptyState icon={<Boxes className="w-6 h-6" />} title="Aucune alerte" description="Tous les stocks sont au-dessus du seuil." /> : (
            <div className="space-y-1">{stats.lowStock.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-neutral-100 last:border-0"><div className="min-w-0"><p className="text-sm font-medium text-neutral-900 truncate">{item.product?.name}</p><p className="text-xs text-neutral-500">{item.boutique?.name}</p></div><Badge variant={item.quantity === 0 ? 'error' : 'warning'}>{item.quantity} / {item.reorder_threshold}</Badge></div>)}</div>
          )}
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4"><div><p className="section-eyebrow">Performance</p><h2 className="font-semibold text-neutral-900 mt-1">Top produits du mois</h2></div><Package className="w-4 h-4 text-primary-500" /></div>
          {topProducts.length === 0 ? <EmptyState icon={<Package className="w-6 h-6" />} title="Aucune vente" /> : <div className="space-y-1">{topProducts.map((product, index) => <div key={product.name} className="flex items-center justify-between gap-3 py-2.5 border-b border-neutral-100 last:border-0"><div className="flex items-center gap-2.5 min-w-0"><span className="w-6 h-6 rounded-md bg-primary-50 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">{index + 1}</span><p className="text-sm font-medium text-neutral-900 truncate">{product.name}</p></div><div className="text-right shrink-0"><p className="text-sm font-semibold text-neutral-900">{formatXOF(product.revenue)}</p><p className="text-[11px] text-neutral-500">{product.quantity} vendus</p></div></div>)}</div>}
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4"><div><p className="section-eyebrow">Relation client</p><h2 className="font-semibold text-neutral-900 mt-1">Meilleurs clients</h2></div><Users className="w-4 h-4 text-accent-500" /></div>
          {topCustomers.length === 0 ? <EmptyState icon={<Users className="w-6 h-6" />} title="Aucun client" /> : <div className="space-y-1">{topCustomers.map((customer, index) => <div key={customer.name} className="flex items-center justify-between gap-3 py-2.5 border-b border-neutral-100 last:border-0"><div className="flex items-center gap-2.5 min-w-0"><span className="w-6 h-6 rounded-md bg-accent-50 text-accent-700 text-xs font-bold flex items-center justify-center shrink-0">{index + 1}</span><p className="text-sm font-medium text-neutral-900 truncate">{customer.name}</p></div><div className="text-right shrink-0"><p className="text-sm font-semibold text-neutral-900">{formatXOF(customer.total)}</p><p className="text-[11px] text-neutral-500">{customer.count} achat{customer.count > 1 ? 's' : ''}</p></div></div>)}</div>}
        </div>
      </section>
    </div>
  )
}

