import { useEffect, useState } from 'react'
import { UserCog, Plus, Shield, Store, Lock, Unlock, Loader2 } from 'lucide-react'
import { supabase, Profile, Boutique } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAudit } from '../lib/audit'
import { PageHeader, Spinner, EmptyState, Modal, Badge } from '../components/ui'
import { getInitials } from '../lib/utils'

export default function Users() {
  const { profile: myProfile, signUp, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'manager' as 'admin' | 'manager', boutique_id: '' })

  useEffect(() => {
    if (myProfile?.role !== 'admin') return
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const [p, b] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('boutiques').select('*').eq('is_active', true).order('name'),
    ])
    setProfiles((p.data as Profile[]) ?? [])
    setBoutiques((b.data as Boutique[]) ?? [])
    setLoading(false)
  }

  const toggleStockPermission = async (p: Profile) => {
    const newVal = !p.can_modify_stock
    const { data: old } = await supabase.from('profiles').select('*').eq('id', p.id).maybeSingle()
    await supabase.from('profiles').update({ can_modify_stock: newVal }).eq('id', p.id)
    await logAudit('update_permission', 'profiles', p.id, old, { ...old, can_modify_stock: newVal })
    load()
  }

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    const { error } = await signUp(form.email.trim(), form.password, form.full_name.trim(), form.role, form.boutique_id || null)
    setSaving(false)
    if (error) {
      setError(error)
    } else {
      setShowModal(false)
      setForm({ full_name: '', email: '', password: '', role: 'manager', boutique_id: '' })
      load()
    }
  }

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        subtitle={`${profiles.length} utilisateur${profiles.length > 1 ? 's' : ''}`}
        actions={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nouvel utilisateur</button>}
      />

      {profiles.length === 0 ? (
        <div className="card"><EmptyState icon={<UserCog className="w-7 h-7" />} title="Aucun utilisateur" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Utilisateur</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Rôle</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden md:table-cell">Boutique</th>
                  <th className="text-center text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Modif. stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {profiles.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">{getInitials(p.full_name || 'U')}</div>
                        <div><p className="text-sm font-medium text-neutral-900">{p.full_name || 'Sans nom'}</p><p className="text-xs text-neutral-500">{p.id === myProfile?.id ? 'Vous' : ''}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.role === 'admin' ? <Badge variant="primary"><Shield className="w-3 h-3" /> Admin</Badge> : <Badge variant="accent"><UserCog className="w-3 h-3" /> Gestionnaire</Badge>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-neutral-600">
                      {boutiques.find((b) => b.id === p.boutique_id)?.name ?? <span className="text-neutral-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.role === 'admin' ? (
                        <span className="text-xs text-neutral-400">Toujours</span>
                      ) : (
                        <button
                          onClick={() => toggleStockPermission(p)}
                          className={`p-1.5 rounded-lg transition-colors ${p.can_modify_stock ? 'text-success-600 hover:bg-success-50' : 'text-neutral-400 hover:bg-neutral-100'}`}
                          title={p.can_modify_stock ? 'Autorisé' : 'Non autorisé'}
                        >
                          {p.can_modify_stock ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvel utilisateur">
        <div className="space-y-4">
          <div><label className="label">Nom complet *</label><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Mot de passe *</label><input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 caractères" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Rôle</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
                <option value="manager">Gestionnaire</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div>
              <label className="label">Boutique</label>
              <select className="input" value={form.boutique_id} onChange={(e) => setForm({ ...form, boutique_id: e.target.value })} disabled={form.role === 'admin'}>
                <option value="">— Aucune —</option>
                {boutiques.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg p-3">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleCreate} disabled={saving || !form.email || !form.password || !form.full_name}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
