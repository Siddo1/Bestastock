import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Package, Pencil, Filter } from 'lucide-react'
import { supabase, Product, Category, Supplier } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui'
import { formatXOF } from '../lib/utils'

export default function Products() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const canModify = isAdmin || profile?.can_modify_stock
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const [p, c, s] = await Promise.all([
      supabase.from('products').select('*, category:categories(*), supplier:suppliers(*)').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('suppliers').select('*').order('name'),
    ])
    setProducts((p.data as Product[]) ?? [])
    setCategories((c.data as Category[]) ?? [])
    setSuppliers((s.data as Supplier[]) ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      const matchCat = !categoryFilter || p.category_id === categoryFilter
      return matchSearch && matchCat
    })
  }, [products, search, categoryFilter])

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle={`${products.length} produit${products.length > 1 ? 's' : ''} au catalogue`}
        actions={
          canModify && (
            <Link to="/products/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Nouveau produit
            </Link>
          )
        }
      />

      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input sm:w-56"
          >
            <option value="">Toutes catégories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Package className="w-7 h-7" />}
            title="Aucun produit trouvé"
            description={canModify ? 'Ajoutez votre premier produit au catalogue.' : undefined}
            action={canModify && <Link to="/products/new" className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</Link>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Produit</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">SKU</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Catégorie</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Prix achat</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Prix vente</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Marge</th>
                  {canModify && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((p) => {
                  const margin = Number(p.sale_price) - Number(p.purchase_price)
                  const marginPct = Number(p.purchase_price) > 0 ? (margin / Number(p.purchase_price)) * 100 : 0
                  return (
                    <tr key={p.id} className="table-row">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {p.photos?.[0] ? (
                              <img src={p.photos[0]} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-neutral-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-900 truncate">{p.name}</p>
                            <p className="text-xs text-neutral-500 md:hidden">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm text-neutral-600 font-mono">{p.sku}</span></td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {p.category ? <Badge variant="primary">{p.category.name}</Badge> : <span className="text-sm text-neutral-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-neutral-600">{formatXOF(Number(p.purchase_price))}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">{formatXOF(Number(p.sale_price))}</td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-sm text-success-600 font-medium">+{formatXOF(margin)}</span>
                        <span className="text-xs text-neutral-400 ml-1">({marginPct.toFixed(0)}%)</span>
                      </td>
                      {canModify && (
                        <td className="px-4 py-3 text-right">
                          <Link to={`/products/${p.id}/edit`} className="text-neutral-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-primary-50">
                            <Pencil className="w-4 h-4" />
                          </Link>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
