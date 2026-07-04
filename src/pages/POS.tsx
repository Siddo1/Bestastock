import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, X, Check,
  User, Loader2, Receipt, Package,
} from 'lucide-react'
import { supabase, Product, Customer, StockItem } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAudit } from '../lib/audit'
import { Spinner, Modal, Badge } from '../components/ui'
import { formatXOF, cn } from '../lib/utils'

type CartItem = {
  product: Product
  quantity: number
  unit_price: number
  stock_qty: number
}

export default function POS() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card' | 'other'>('cash')
  const [discount, setDiscount] = useState('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [lastSaleId, setLastSaleId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const boutiqueId = profile?.boutique_id
    if (!boutiqueId && profile?.role !== 'admin') {
      setLoading(false)
      return
    }

    const [pRes, sRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('stock_items').select('product_id, quantity').eq('boutique_id', boutiqueId),
    ])
    setProducts((pRes.data as Product[]) ?? [])
    const sm: Record<string, number> = {}
    ;((sRes.data as StockItem[]) ?? []).forEach((s) => { sm[s.product_id] = s.quantity })
    setStockMap(sm)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (!search) return true
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode ?? '').includes(search)
    })
  }, [products, search])

  const addToCart = (product: Product) => {
    const stockQty = stockMap[product.id] ?? 0
    if (stockQty <= 0) return
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        if (existing.quantity >= stockQty) return prev
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1, unit_price: Number(product.sale_price), stock_qty: stockQty }]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.product.id !== productId) return i
      const newQty = Math.max(0, Math.min(i.quantity + delta, i.stock_qty))
      return { ...i, quantity: newQty }
    }).filter((i) => i.quantity > 0))
  }

  const setQty = (productId: string, qty: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.product.id !== productId) return i
      return { ...i, quantity: Math.max(0, Math.min(qty, i.stock_qty)) }
    }).filter((i) => i.quantity > 0))
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0), [cart])
  const discountAmount = Math.min(Number(discount) || 0, subtotal)
  const total = subtotal - discountAmount

  const searchCustomers = useCallback(async (q: string) => {
    if (q.length < 2) { setCustomerResults([]); return }
    const { data } = await supabase.from('customers').select('*').or(`phone.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`).limit(10)
    setCustomerResults((data as Customer[]) ?? [])
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(customerSearch), 300)
    return () => clearTimeout(t)
  }, [customerSearch, searchCustomers])

  const handleCheckout = async () => {
    if (cart.length === 0 || !profile?.boutique_id) return
    setProcessing(true)

    const saleData = {
      boutique_id: profile.boutique_id,
      customer_id: customer?.id ?? null,
      total_amount: total,
      discount: discountAmount,
      payment_method: paymentMethod,
      status: 'completed' as const,
      notes: notes.trim() || null,
    }

    const { data: sale, error: saleError } = await supabase.from('sales').insert(saleData).select().single()
    if (saleError || !sale) {
      setProcessing(false)
      alert('Erreur: ' + (saleError?.message ?? 'échec de la vente'))
      return
    }

    // Insert sale items
    const items = cart.map((i) => ({
      sale_id: sale.id,
      product_id: i.product.id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      discount: 0,
    }))
    await supabase.from('sale_items').insert(items)

    // Decrement stock + create movements
    for (const item of cart) {
      const { data: stockItem } = await supabase.from('stock_items').select('*').eq('product_id', item.product.id).eq('boutique_id', profile.boutique_id).maybeSingle()
      if (stockItem) {
        await supabase.from('stock_items').update({ quantity: stockItem.quantity - item.quantity, updated_at: new Date().toISOString() }).eq('id', stockItem.id)
        await supabase.from('stock_movements').insert({
          product_id: item.product.id,
          boutique_id: profile.boutique_id,
          quantity: -item.quantity,
          movement_type: 'sale',
          reference_id: sale.id,
          notes: `Vente ${sale.id.slice(0, 8)}`,
          performed_by: profile.id,
        })
      }
    }

    await logAudit('create_sale', 'sales', sale.id, null, saleData)
    setProcessing(false)
    setLastSaleId(sale.id)
    setShowCheckoutModal(false)
  }

  const resetSale = () => {
    setCart([])
    setCustomer(null)
    setDiscount('')
    setNotes('')
    setPaymentMethod('cash')
    setLastSaleId(null)
  }

  if (loading) return <Spinner lg />

  if (!profile?.boutique_id && profile?.role !== 'admin') {
    return (
      <div className="card p-8 text-center">
        <p className="text-neutral-600">Aucune boutique assignée. Contactez l'administrateur.</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-7rem)] flex flex-col lg:flex-row gap-4">
      {/* Product grid */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="card p-3 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Scanner ou rechercher un produit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 text-base"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="card p-8 text-center">
              <Package className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">Aucun produit trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((p) => {
                const qty = stockMap[p.id] ?? 0
                const out = qty <= 0
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={out}
                    className={cn(
                      'card p-3 text-left transition-all hover:shadow-md hover:border-primary-300 active:scale-[0.98] group',
                      out && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <div className="w-full aspect-square rounded-lg bg-neutral-100 mb-2 overflow-hidden flex items-center justify-center">
                      {p.photos?.[0] ? (
                        <img src={p.photos[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-neutral-300" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-neutral-900 line-clamp-2 leading-tight">{p.name}</p>
                    <p className="text-xs text-neutral-500 font-mono mt-0.5">{p.sku}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold text-primary-600">{formatXOF(Number(p.sale_price))}</p>
                      <Badge variant={out ? 'error' : qty <= 5 ? 'warning' : 'success'}>{out ? 'Rupture' : `${qty}`}</Badge>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="p-4 border-b border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-neutral-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Panier
              {cart.length > 0 && <Badge variant="primary">{cart.length}</Badge>}
            </h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-neutral-400 hover:text-error-500">Vider</button>
            )}
          </div>

          <button
            onClick={() => setShowCustomerModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
          >
            <User className="w-4 h-4 text-neutral-400" />
            {customer ? (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{`${customer.first_name} ${customer.last_name}`.trim()}</p>
                <p className="text-xs text-neutral-500">{customer.phone}</p>
              </div>
            ) : (
              <p className="flex-1 text-sm text-neutral-400">Sélectionner un client (optionnel)</p>
            )}
            {customer && <X className="w-4 h-4 text-neutral-400 hover:text-error-500" onClick={(e) => { e.stopPropagation(); setCustomer(null) }} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <ShoppingCart className="w-12 h-12 text-neutral-200 mb-3" />
              <p className="text-sm text-neutral-400">Panier vide</p>
              <p className="text-xs text-neutral-400 mt-1">Cliquez sur un produit pour l'ajouter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex gap-3 pb-3 border-b border-neutral-100 last:border-0">
                  <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                    {item.product.photos?.[0] ? (
                      <img src={item.product.photos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-neutral-300 m-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{item.product.name}</p>
                    <p className="text-xs text-neutral-500">{formatXOF(item.unit_price)} / unité</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 rounded-md bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => setQty(item.product.id, Number(e.target.value))}
                        className="w-10 text-center text-sm font-semibold border-0 p-0 focus:ring-0 bg-transparent"
                      />
                      <button onClick={() => updateQty(item.product.id, 1)} disabled={item.quantity >= item.stock_qty} className="w-6 h-6 rounded-md bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center disabled:opacity-40"><Plus className="w-3 h-3" /></button>
                      <button onClick={() => removeFromCart(item.product.id)} className="ml-auto text-neutral-400 hover:text-error-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-neutral-900 shrink-0">{formatXOF(item.quantity * item.unit_price)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-neutral-100 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Sous-total</span><span>{formatXOF(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-neutral-600">
                <span>Remise</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-24 text-right text-sm border border-neutral-200 rounded-md px-2 py-1 focus:border-primary-400 focus:ring-1 focus:ring-primary-100 focus:outline-none"
                />
              </div>
              <div className="flex justify-between text-base font-bold text-neutral-900 pt-1.5 border-t border-neutral-100">
                <span>Total</span><span>{formatXOF(total)}</span>
              </div>
            </div>
            <button onClick={() => setShowCheckoutModal(true)} className="btn-primary w-full text-base py-3">
              <Check className="w-5 h-5" /> Encaisser
            </button>
          </div>
        )}
      </div>

      {/* Customer modal */}
      <Modal open={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Sélectionner un client">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400" />
            <input
              type="text"
              placeholder="Nom ou téléphone…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="input pl-10"
              autoFocus
            />
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {customerResults.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCustomer(c); setShowCustomerModal(false); setCustomerSearch('') }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-sm font-semibold">
                  {`${c.first_name[0] ?? ''}${c.last_name[0] ?? ''}`.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{`${c.first_name} ${c.last_name}`.trim()}</p>
                  <p className="text-xs text-neutral-500">{c.phone}</p>
                </div>
              </button>
            ))}
            {customerSearch.length >= 2 && customerResults.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">Aucun client trouvé</p>
            )}
          </div>
          <Link to="/customers/new" className="btn-secondary w-full justify-center">
            <Plus className="w-4 h-4" /> Créer un nouveau client
          </Link>
        </div>
      </Modal>

      {/* Checkout modal */}
      <Modal open={showCheckoutModal} onClose={() => !processing && setShowCheckoutModal(false)} title="Finaliser la vente">
        <div className="space-y-4">
          <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm text-neutral-600"><span>Sous-total</span><span>{formatXOF(subtotal)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-sm text-neutral-600"><span>Remise</span><span>-{formatXOF(discountAmount)}</span></div>}
            <div className="flex justify-between text-lg font-bold text-neutral-900 pt-2 border-t border-neutral-200"><span>Total à payer</span><span>{formatXOF(total)}</span></div>
          </div>

          <div>
            <label className="label">Mode de paiement</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'cash', l: 'Espèces' },
                { v: 'mobile_money', l: 'Mobile Money' },
                { v: 'card', l: 'Carte' },
                { v: 'other', l: 'Autre' },
              ].map((m) => (
                <button
                  key={m.v}
                  onClick={() => setPaymentMethod(m.v as any)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                    paymentMethod === m.v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50',
                  )}
                >
                  {m.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notes (optionnel)</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Référence, commentaire…" />
          </div>

          <button onClick={handleCheckout} disabled={processing} className="btn-primary w-full text-base py-3">
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            {processing ? 'Traitement…' : 'Confirmer la vente'}
          </button>
        </div>
      </Modal>

      {/* Success modal */}
      <Modal open={!!lastSaleId} onClose={resetSale} title="Vente enregistrée" size="sm">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-success-100 text-success-600 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8" />
          </div>
          <p className="text-lg font-bold text-neutral-900">Vente réussie !</p>
          <p className="text-sm text-neutral-500 mt-1">Total: {formatXOF(total)}</p>
          <div className="flex gap-2 mt-6">
            <button onClick={resetSale} className="btn-secondary flex-1">Nouvelle vente</button>
            <button onClick={() => navigate(`/sales/${lastSaleId}`)} className="btn-primary flex-1">
              <Receipt className="w-4 h-4" /> Voir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

