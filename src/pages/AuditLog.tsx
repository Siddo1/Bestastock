import { useEffect, useState } from 'react'
import { ScrollText, Search } from 'lucide-react'
import { supabase, AuditLog } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui'
import { formatDateTime } from '../lib/utils'

export default function AuditLogPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [search, setSearch] = useState('')
  const [userNames, setUserNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (profile?.role !== 'admin') return
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(500)
    const logs = (data as AuditLog[]) ?? []
    setLogs(logs)
    // Load user names
    const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
      const map: Record<string, string> = {}
      ;(profiles ?? []).forEach((p: any) => { map[p.id] = p.full_name })
      setUserNames(map)
    }
    setLoading(false)
  }

  const filtered = logs.filter((l) => {
    if (!search) return true
    const q = search.toLowerCase()
    return l.action.toLowerCase().includes(q) || l.table_name.toLowerCase().includes(q)
  })

  if (loading) return <Spinner lg />

  return (
    <div>
      <PageHeader title="Journal d'audit" subtitle={`${logs.length} action${logs.length > 1 ? 's' : ''} journalisée${logs.length > 1 ? 's' : ''}`} />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400" />
          <input type="text" placeholder="Rechercher par action ou table…" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={<ScrollText className="w-7 h-7" />} title="Aucune entrée" description="Le journal d'audit est vide." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Utilisateur</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Action</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden sm:table-cell">Table</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden md:table-cell">Enregistrement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="table-row">
                    <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-900">{userNames[l.user_id ?? ''] ?? '—'}</td>
                    <td className="px-4 py-3"><Badge variant={l.action.startsWith('create') ? 'success' : l.action.startsWith('delete') ? 'error' : l.action.includes('permission') ? 'accent' : 'primary'}>{l.action}</Badge></td>
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-neutral-600 font-mono">{l.table_name}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-neutral-400 font-mono">{l.record_id?.slice(0, 8) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
