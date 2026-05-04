import { supabase } from './supabaseClient'

/** Build `text[]` lines: `Task: …`, `Description: …`; omit empty parts; `null` if nothing to store. */
function linesForTaskDescription(title, description) {
  const lines = []
  if (title != null && String(title).trim() !== '') {
    lines.push(`Task: ${String(title)}`)
  }
  if (description != null && String(description).trim() !== '') {
    lines.push(`Description: ${String(description)}`)
  }
  return lines.length > 0 ? lines : null
}

/**
 * Inserts into `TaskLog` (no RPC — avoids PostgREST "function not in schema cache" when the RPC
 * was never created or not exposed). Returns the new row via `.select().single()`.
 * Matches table: user_id as text (auth UID string), old_value/new_value as text[].
 */
export async function Log_insertion({
  userId,
  taskId,
  titleOld,
  titleNew,
  descOld,
  descNew,
  action,
}) {
  if (!userId) {
    return { data: null, error: { message: 'Missing user id for TaskLog' } }
  }
  const tid =
    typeof taskId === 'bigint' ? Number(taskId) : typeof taskId === 'string' ? Number(taskId) : taskId
  if (!Number.isFinite(tid)) {
    return { data: null, error: { message: 'Invalid task id for TaskLog' } }
  }

  const old_value = linesForTaskDescription(titleOld, descOld)
  const new_value = linesForTaskDescription(titleNew, descNew)

  return supabase
    .from('TaskLog')
    .insert({
      id: tid,
      action,
      user_id: String(userId),
      old_value,
      new_value,
    })
    .select()
    .single()
}
