import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/audit'
import { PageHeader, Spinner } from '../components/ui'

export default function CustomerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    if (isEdit && id) {
      const { data } = await supabase.from('customers').select('*').eq('id', id).maybeSingle()
      if (data) {
        setForm({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          address: data.address ?? '',
          notes: data.notes ?? '',
        })
      }
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    }

    if (!payload.phone) {
      setError('Le numéro de téléphone est obligatoire.')
      setSaving(false)
      return
    }

    let result
    if (isEdit && id) {
      const { data: old } = await supabase.from('customers').select('*').eq('id', id).maybeSingle()
      result = await supabase.from('customers').update(payload).eq('id', id).select().single()
      if (result.data) await logAudit('update', 'customers', id, old, result.data)
    } else {
      result = await supabase.from('customers').insert(payload).select().single()
      if (result.data) await logAudit('create', 'customers', result.data.id, null, result.data)
    }

    setSaving(false)
    if (result.error) {
      const msg = result.error.message
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setError('Ce numéro de téléphone existe déjà. Un client avec ce numéro est déjà enregistré.')
      } else {
        setError(msg)
      }
    } else {
      navigate(isEdit ? `/customers/${id}` : '/customers')
    }
  }

  if (loading) return <Spinner lg />

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={isEdit ? 'Modifier le client' : 'Nouveau client'}
        actions={<button onClick={() => navigate(-1)} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Retour</button>}
      />

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Prénom</label>
            <input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Nom</label>
            <input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label">Téléphone * <span className="text-xs text-neutral-400 font-normal">(doit être unique)</span></label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+221 77 123 45 67" required />
        </div>

        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <div>
          <label className="label">Adresse</label>
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        {error && <div className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg p-3">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  )
}
