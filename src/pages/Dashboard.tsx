import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, Package, DollarSign, AlertTriangle, ShoppingCart,
  Users, ArrowUpRight, Boxes, Store,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { supabase, Product, StockItem, Sale, Customer } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, StatCard, Spinner, Badge, EmptyState } from '../components/ui'
import { formatXOF, formatNumber, formatDate } from '../lib/utils'

const PIE_COLORS = ['#f57c0b', '#33a4ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Dashboard() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [todaySales, setTodaySales] = useState<Sale[]>([])
  const [monthSales, setMonthSales] = useState<Sale[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [boutiques, setBoutiques] = useState<any[]>([])
  const [boutiqueSales, setBoutiqueSales] = useState<any[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const boutiqueFilter = !isAdmin && profile?.boutique_id
      ? `boutique_id=eq.${profile.boutique_id}`
      : undefined

    const [stockRes, todaySalesRes, monthSalesRes, boutiquesRes] = await Promise.all([
      supabase.from('stock_items').select('*, product:products(*), boutique:boutiques(*)').then((r) => r),
      supabase.from('sales').select('*, customer:customers(*), boutique:boutiques(*)').gte('created_at', today.toISOString()).eq('status', 'completed'),
      supabase.from('sales').select('*, customer:customers(*), boutique:boutiques(*), sale_items:sale_items(*, product:products(*))').gte('created_at', monthStart.toISOString()).eq('status', 'completed'),
      supabase.from('boutiques').select('*').eq('is_active', true),
    ])

    const stock = (stockRes.data as StockItem[]) ?? []
    setStockItems(stock)
    setTodaySales((todaySalesRes.data as Sale[]) ?? [])
    setMonthSales((monthSalesRes.data as Sale[]) ?? [])
    setBoutiques((boutiquesRes.data as any[]) ?? [])

    // Top products this month
    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
    ;((monthSalesRes.data as Sale[]) ?? []).forEach((sale) => {
      sale.sale_items?.forEach((item) => {
        const key = item.product_id
        if (!productMap[key]) {
          productMap[key] = { name: item.product?.name ?? 'Inconnu', quantity: 0, revenue: 0 }
        }
        productMap[key].quantity += item.quantity
        productMap[key].revenue += item.quantity * item.unit_price - item.discount
      })
    })
    setTopProducts(Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5))

    // Top customers this month
    const custMap: Record<string, { name: string; total: number; count: number }> = {}
    ;((monthSalesRes.data as Sale[]) ?? []).forEach((sale) => {
      if (!sale.customer_id) return
      const key = sale.customer_id
      const name = sale.customer ? `${sale.customer.first_name} ${sale.customer.last_name}`.trim() : 'Inconnu'
      if (!custMap[key]) custMap[key] = { name, total: 0, count: 0 }
      custMap[key].total += Number(sale.total_amount)
      custMap[key].count += 1
    })
    setTopCustomers(Object.values(custMap).sort((a, b) => b.total - a.total).slice(0, 5))

    // Sales by boutique (admin only)
    if (isAdmin) {
      const bSales = (monthSalesRes.data as Sale[]) ?? []
      const bMap: Record<string, { name: string; total: number }> = {}
      bSales.forEach((s) => {
        const b = s.boutique
        if (!b) return
        if (!bMap[b.id]) bMap[b.id] = { name: b.name, total: 0 }
        bMap[b.id].total += Number(s.total_amount)
      })
      setBoutiqueSales(Object.values(bMap))
    }

    setLoading(false)
  }

  const stats = useMemo(() => {
    const stockValue = stockItems.reduce((sum, s) => sum + s.quantity * Number(s.product?.purchase_price ?? 0), 0)
    const stockQty = stockItems.reduce((sum, s) => sum + s.quantity, 0)
    const lowStock = stockItems.filter((s) => s.quantity <= s.reorder_threshold)
    const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total_amount), 0)
    const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.total_amount), 0)
    const todayCount = todaySales.length
    return { stockValue, stockQty, lowStock, todayRevenue, monthRevenue, todayCount }
  }, [stockItems, todaySales, monthSales])

  // Daily sales chart (last 7 days)
  const dailyChart = useMemo(() => {
    const days: { day: string; ventes: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      const daySales = monthSales.filter((s) => {
        const sd = new Date(s.created_at)
        return sd >= d && sd < next
      })
      const total = daySales.reduce((sum, s) => sum + Number(s.total_amount), 0)
      days.push({ day: d.toLocaleDateString('fr-FR', { weekday: 'short' }), ventes: total })
    }
    return days
  }, [monthSales])

  // Category distribution
  const categoryChart = useMemo(() => {
    const catMap: Record<string, number> = {}
    stockItems.forEach((s) => {
      const cat = s.product?.category_id ?? 'Autres'
      catMap[cat] = (catMap[cat] ?? 0) + s.quantity * Number(s.product?.purchase_price ?? 0)
    })
    return Object.entries(catMap).map(([k, v]) => ({ name: k.slice(0, 8), value: v })).slice(0, 7)
  }, [stockItems])

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'Tableau de bord' : `Tableau de bord — ${profile?.boutique_id ? '' : ''}`}
        subtitle={isAdmin ? 'Vue consolidée de toutes les boutiques' : 'Vue de votre boutique'}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Valeur totale du stock"
          value={formatXOF(stats.stockValue)}
          icon={<DollarSign className="w-5 h-5" />}
          color="primary"
          trend={`${formatNumber(stats.stockQty)} unités en stock`}
        />
        <StatCard
          label="Ventes du jour"
          value={formatXOF(stats.todayRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="success"
          trend={`${stats.todayCount} transaction${stats.todayCount > 1 ? 's' : ''}`}
          trendUp
        />
        <StatCard
          label="Ventes du mois"
          value={formatXOF(stats.monthRevenue)}
          icon={<ShoppingCart className="w-5 h-5" />}
          color="accent"
        />
        <StatCard
          label="Alertes de réappro."
          value={formatNumber(stats.lowStock.length)}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={stats.lowStock.length > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-neutral-900 mb-4">Ventes des 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => [formatXOF(v), 'Ventes']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }}
              />
              <Bar dataKey="ventes" fill="#f57c0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {isAdmin && boutiqueSales.length > 0 ? (
          <div className="card p-5">
            <h3 className="font-semibold text-neutral-900 mb-4">Ventes par boutique (mois)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={boutiqueSales} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                  {boutiqueSales.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatXOF(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card p-5">
            <h3 className="font-semibold text-neutral-900 mb-4">Valeur stock par catégorie</h3>
            {categoryChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categoryChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                    {categoryChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatXOF(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-neutral-500 text-center py-20">Aucune donnée</p>}
          </div>
        )}
      </div>

      {/* Low stock + Top products + Top customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Low stock alerts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900">Stock bas</h3>
            <Link to="/stock" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              Voir tout <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {stats.lowStock.length === 0 ? (
            <EmptyState icon={<Boxes className="w-6 h-6" />} title="Aucune alerte" description="Tous les stocks sont au-dessus du seuil." />
          ) : (
            <div className="space-y-2.5">
              {stats.lowStock.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{s.product?.name}</p>
                    <p className="text-xs text-neutral-500">{s.boutique?.name}</p>
                  </div>
                  <Badge variant={s.quantity === 0 ? 'error' : 'warning'}>
                    {s.quantity} / {s.reorder_threshold}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900">Top produits du mois</h3>
            <Package className="w-4 h-4 text-neutral-400" />
          </div>
          {topProducts.length === 0 ? (
            <EmptyState icon={<Package className="w-6 h-6" />} title="Aucune vente" />
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <p className="text-sm font-medium text-neutral-900 truncate">{p.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-neutral-900">{formatXOF(p.revenue)}</p>
                    <p className="text-xs text-neutral-500">{p.quantity} vendus</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top customers */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900">Meilleurs clients du mois</h3>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          {topCustomers.length === 0 ? (
            <EmptyState icon={<Users className="w-6 h-6" />} title="Aucun client" />
          ) : (
            <div className="space-y-2.5">
              {topCustomers.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-accent-100 text-accent-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <p className="text-sm font-medium text-neutral-900 truncate">{c.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-neutral-900">{formatXOF(c.total)}</p>
                    <p className="text-xs text-neutral-500">{c.count} achat{c.count > 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
