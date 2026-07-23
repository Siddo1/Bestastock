import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Package, Pencil, Trash2, Loader2 } from 'lucide-react'
import { supabase, Product, Category, Supplier } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAudit } from '../lib/audit'
import { PageHeader, Spinner, EmptyState, Badge, ConfirmDialog } from '../components/ui'
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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

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

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allShownSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allShownSelected) filtered.forEach((p) => next.delete(p.id))
      else filtered.forEach((p) => next.add(p.id))
      return next
    })
  }

  const handleBulkDelete = async () => {
    setDeleting(true)
    setNotice(null)
    const ids = [...selected]
    let ok = 0
    let failed = 0
    for (const id of ids) {
      const { data: old } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) { failed++; continue }
      await logAudit('delete', 'products', id, old, null)
      ok++
    }
    setDeleting(false)
    setSelected(new Set())
    setNotice(
      failed > 0
        ? `${ok} produit(s) supprimé(s). ${failed} non supprimé(s) (liés à des ventes/achats).`
        : `${ok} produit(s) supprimé(s).`
    )
    load()
  }

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

      {notice && (
        <div className="mb-4 text-sm text-neutral-700 bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>
      )}

      {isAdmin && selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-neutral-900 text-white rounded-lg px-4 py-2.5 animate-fade-in">
          <span className="text-sm font-medium">{selected.size} produit(s) sélectionné(s)</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="text-sm text-neutral-300 hover:text-white px-2">Annuler</button>
            <button onClick={() => setConfirmOpen(true)} disabled={deleting} className="btn-danger text-sm py-1.5">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Supprimer la sélection
            </button>
          </div>
        </div>
      )}

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
                  {isAdmin && (
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" className="w-4 h-4 accent-primary-500 cursor-pointer" checked={allShownSelected} onChange={toggleAll} />
                    </th>
                  )}
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
                    <tr key={p.id} className={`table-row ${selected.has(p.id) ? 'bg-primary-50/50' : ''}`}>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <input type="checkbox" className="w-4 h-4 accent-primary-500 cursor-pointer" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} />
                        </td>
                      )}
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

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Supprimer ${selected.size} produit(s) ?`}
        message="Les produits sélectionnés et leur stock associé seront définitivement supprimés. Cette action est irréversible."
        confirmLabel="Supprimer"
        danger
      />
    </div>
  )
}
