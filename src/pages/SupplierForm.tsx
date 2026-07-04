import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/audit'
import { useAuth } from '../lib/auth'
import { PageHeader, Spinner } from '../components/ui'

export default function SupplierForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', contact_name: '', phone: '', email: '', address: '', notes: '' })

  useEffect(() => {
    if (profile?.role !== 'admin') { navigate('/suppliers'); return }
    loadData()
  }, [id])

  const loadData = async () => {
    if (isEdit && id) {
      const { data } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle()
      if (data) setForm({ name: data.name, contact_name: data.contact_name ?? '', phone: data.phone ?? '', email: data.email ?? '', address: data.address ?? '', notes: data.notes ?? '' })
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      name: form.name.trim(),
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    }
    if (!payload.name) { setError('Le nom est obligatoire.'); setSaving(false); return }

    let result
    if (isEdit && id) {
      const { data: old } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle()
      result = await supabase.from('suppliers').update(payload).eq('id', id).select().single()
      if (result.data) await logAudit('update', 'suppliers', id, old, result.data)
    } else {
      result = await supabase.from('suppliers').insert(payload).select().single()
      if (result.data) await logAudit('create', 'suppliers', result.data.id, null, result.data)
    }
    setSaving(false)
    if (result.error) setError(result.error.message)
    else navigate('/suppliers')
  }

  if (loading) return <Spinner lg />

  return (
    <div className="max-w-2xl">
      <PageHeader title={isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'} actions={<button onClick={() => navigate('/suppliers')} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Retour</button>} />
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div><label className="label">Nom *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Contact</label><input className="input" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
          <div><label className="label">Téléphone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className="label">Adresse</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div><label className="label">Notes</label><textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        {error && <div className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg p-3">{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/suppliers')}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    </div>
  )
}
