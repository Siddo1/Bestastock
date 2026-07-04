import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Printer, Receipt } from 'lucide-react'
import { supabase, Sale } from '../lib/supabase'
import { Spinner, EmptyState, Badge } from '../components/ui'
import { formatXOF, formatDateTime } from '../lib/utils'

export default function SaleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [sale, setSale] = useState<Sale | null>(null)

  useEffect(() => { load() }, [id])

  const load = async () => {
    if (!id) return
    const { data } = await supabase
      .from('sales')
      .select('*, customer:customers(*), boutique:boutiques(*), sale_items:sale_items(*, product:products(*))')
      .eq('id', id)
      .maybeSingle()
    setSale(data as Sale | null)
    setLoading(false)
  }

  if (loading) return <Spinner lg />
  if (!sale) return <EmptyState title="Vente introuvable" />

  const subtotal = sale.sale_items?.reduce((sum, i) => sum + i.quantity * Number(i.unit_price), 0) ?? 0

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/sales')} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Retour</button>
        <button onClick={() => window.print()} className="btn-secondary"><Printer className="w-4 h-4" /> Imprimer</button>
      </div>

      <div className="card p-6">
        <div className="text-center pb-6 border-b border-neutral-100">
          <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900">Reçu de vente</h1>
          <p className="text-sm text-neutral-500 mt-1">{sale.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-sm text-neutral-500">{formatDateTime(sale.created_at)}</p>
        </div>

        <div className="py-4 space-y-2 text-sm border-b border-neutral-100">
          <div className="flex justify-between"><span className="text-neutral-500">Boutique</span><span className="font-medium text-neutral-900">{sale.boutique?.name}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">Client</span><span className="font-medium text-neutral-900">{sale.customer ? `${sale.customer.first_name} ${sale.customer.last_name}`.trim() : 'Anonyme'}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">Paiement</span><span className="font-medium text-neutral-900 capitalize">{sale.payment_method === 'cash' ? 'Espèces' : sale.payment_method === 'mobile_money' ? 'Mobile Money' : sale.payment_method === 'card' ? 'Carte' : sale.payment_method}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">Statut</span><Badge variant={sale.status === 'completed' ? 'success' : sale.status === 'cancelled' ? 'error' : 'warning'}>{sale.status === 'completed' ? 'Terminée' : sale.status === 'cancelled' ? 'Annulée' : 'En attente'}</Badge></div>
        </div>

        <div className="py-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase mb-3">Articles</p>
          <div className="space-y-3">
            {sale.sale_items?.map((item) => (
              <div key={item.id} className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">{item.product?.name}</p>
                  <p className="text-xs text-neutral-500">{item.quantity} × {formatXOF(Number(item.unit_price))}</p>
                </div>
                <p className="text-sm font-semibold text-neutral-900">{formatXOF(item.quantity * Number(item.unit_price))}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100 space-y-1.5">
          <div className="flex justify-between text-sm text-neutral-600"><span>Sous-total</span><span>{formatXOF(subtotal)}</span></div>
          {Number(sale.discount) > 0 && <div className="flex justify-between text-sm text-neutral-600"><span>Remise</span><span>-{formatXOF(Number(sale.discount))}</span></div>}
          <div className="flex justify-between text-lg font-bold text-neutral-900 pt-2 border-t border-neutral-100"><span>Total</span><span>{formatXOF(Number(sale.total_amount))}</span></div>
        </div>

        {sale.notes && (
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <p className="text-xs text-neutral-500 mb-1">Notes</p>
            <p className="text-sm text-neutral-700">{sale.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
