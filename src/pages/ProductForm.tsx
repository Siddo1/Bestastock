import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, X, Plus, Trash2 } from 'lucide-react'
import { supabase, Category, Supplier } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAudit } from '../lib/audit'
import { PageHeader, Spinner, ConfirmDialog } from '../components/ui'

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const canModify = isAdmin || profile?.can_modify_stock
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [form, setForm] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    supplier_id: '',
    purchase_price: '',
    sale_price: '',
    barcode: '',
    photos: [] as string[],
  })
  const [photoInput, setPhotoInput] = useState('')

  useEffect(() => {
    if (!canModify) {
      navigate('/products')
      return
    }
    loadData()
  }, [id])

  const loadData = async () => {
    const [cats, sups] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('suppliers').select('*').order('name'),
    ])
    setCategories((cats.data as Category[]) ?? [])
    setSuppliers((sups.data as Supplier[]) ?? [])

    if (isEdit && id) {
      const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
      if (data) {
        setForm({
          sku: data.sku,
          name: data.name,
          description: data.description ?? '',
          category_id: data.category_id ?? '',
          supplier_id: data.supplier_id ?? '',
          purchase_price: String(data.purchase_price),
          sale_price: String(data.sale_price),
          barcode: data.barcode ?? '',
          photos: data.photos ?? [],
        })
      }
    } else {
      // Auto-generate SKU
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true })
      setForm((f) => ({ ...f, sku: `BS-${String((count ?? 0) + 1).padStart(4, '0')}` }))
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
      purchase_price: Number(form.purchase_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      barcode: form.barcode.trim() || null,
      photos: form.photos,
    }

    if (!payload.name || !payload.sku) {
      setError('Le nom et le SKU sont obligatoires.')
      setSaving(false)
      return
    }

    let result
    if (isEdit && id) {
      const { data: old } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
      result = await supabase.from('products').update(payload).eq('id', id).select().single()
      if (result.data) await logAudit('update', 'products', id, old, result.data)
    } else {
      result = await supabase.from('products').insert(payload).select().single()
      if (result.data) await logAudit('create', 'products', result.data.id, null, result.data)
    }

    setSaving(false)
    if (result.error) {
      setError(result.error.message)
    } else {
      navigate('/products')
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setError(null)
    setDeleting(true)
    const { data: old } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
    const { error: delErr } = await supabase.from('products').delete().eq('id', id)
    if (delErr) {
      setDeleting(false)
      setError("Suppression impossible : ce produit est lié à des ventes ou des achats. Désactivez-le plutôt que de le supprimer.")
      return
    }
    await logAudit('delete', 'products', id, old, null)
    navigate('/products')
  }

  const addPhoto = () => {
    const url = photoInput.trim()
    if (url && !form.photos.includes(url)) {
      setForm({ ...form, photos: [...form.photos, url] })
      setPhotoInput('')
    }
  }

  const removePhoto = (idx: number) => {
    setForm({ ...form, photos: form.photos.filter((_, i) => i !== idx) })
  }

  if (loading) return <Spinner lg />

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={isEdit ? 'Modifier le produit' : 'Nouveau produit'}
        actions={
          <button onClick={() => navigate('/products')} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nom du produit *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">SKU / Référence *</label>
            <input className="input font-mono" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Catégorie</label>
            <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">— Aucune —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fournisseur</label>
            <select className="input" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">— Aucun —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Prix d'achat (CFA) *</label>
            <input type="number" min="0" step="1" className="input" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} required />
          </div>
          <div>
            <label className="label">Prix de vente (CFA) *</label>
            <input type="number" min="0" step="1" className="input" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} required />
          </div>
        </div>

        <div>
          <label className="label">Code-barres / QR</label>
          <input className="input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
        </div>

        <div>
          <label className="label">Photos (URLs)</label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="https://…"
              value={photoInput}
              onChange={(e) => setPhotoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPhoto())}
            />
            <button type="button" className="btn-secondary" onClick={addPhoto}><Plus className="w-4 h-4" /></button>
          </div>
          {form.photos.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {form.photos.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-neutral-200 group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-error-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg p-3">{error}</div>}

        <div className="flex justify-between items-center gap-2 pt-2">
          {isEdit && isAdmin ? (
            <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Supprimer
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => navigate('/products')}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Supprimer ce produit ?"
        message={`« ${form.name} » sera définitivement supprimé, ainsi que son stock associé. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
      />
    </div>
  )
}
