import { useEffect, useState } from 'react'
import { Store, Plus, MapPin, Phone, Pencil } from 'lucide-react'
import { supabase, Boutique } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAudit } from '../lib/audit'
import { PageHeader, Spinner, EmptyState, Modal } from '../components/ui'

export default function Boutiques() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [editing, setEditing] = useState<Boutique | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.role !== 'admin') return
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('boutiques').select('*').order('name')
    setBoutiques((data as Boutique[]) ?? [])
    setLoading(false)
  }

  const openNew = () => { setEditing(null); setForm({ name: '', address: '', phone: '' }); setShowModal(true) }
  const openEdit = (b: Boutique) => { setEditing(b); setForm({ name: b.name, address: b.address ?? '', phone: b.phone ?? '' }); setShowModal(true) }

  const handleSave = async () => {
    setSaving(true)
    const payload = { name: form.name.trim(), address: form.address.trim() || null, phone: form.phone.trim() || null }
    if (editing) {
      const { data: old } = await supabase.from('boutiques').select('*').eq('id', editing.id).maybeSingle()
      await supabase.from('boutiques').update(payload).eq('id', editing.id)
      await logAudit('update', 'boutiques', editing.id, old, payload)
    } else {
      const { data } = await supabase.from('boutiques').insert(payload).select().single()
      if (data) await logAudit('create', 'boutiques', data.id, null, payload)
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader
        title="Boutiques"
        subtitle={`${boutiques.length} boutique${boutiques.length > 1 ? 's' : ''} active${boutiques.length > 1 ? 's' : ''}`}
        actions={<button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Nouvelle boutique</button>}
      />

      {boutiques.length === 0 ? (
        <div className="card"><EmptyState icon={<Store className="w-7 h-7" />} title="Aucune boutique" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boutiques.map((b) => (
            <div key={b.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center"><Store className="w-5 h-5" /></div>
                  <div>
                    <p className="font-semibold text-neutral-900">{b.name}</p>
                    <p className="text-xs text-neutral-500">{b.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
                <button onClick={() => openEdit(b)} className="text-neutral-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-primary-50"><Pencil className="w-4 h-4" /></button>
              </div>
              <div className="space-y-1.5 text-sm text-neutral-600">
                {b.address && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-neutral-400" /> {b.address}</div>}
                {b.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-neutral-400" /> {b.phone}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Modifier la boutique' : 'Nouvelle boutique'}>
        <div className="space-y-4">
          <div><label className="label">Nom *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Adresse</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="label">Téléphone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? '…' : 'Enregistrer'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
