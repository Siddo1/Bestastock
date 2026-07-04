import { supabase } from './supabase'

export async function logAudit(
  action: string,
  tableName: string,
  recordId: string | null,
  oldData: Record<string, unknown> | null = null,
  newData: Record<string, unknown> | null = null,
) {
  try {
    await supabase.from('audit_log').insert({
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
    })
  } catch (e) {
    console.error('Failed to write audit log:', e)
  }
}
