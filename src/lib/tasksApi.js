import { Log_insertion } from './logInsertion'
import { supabase } from './supabaseClient'
import { normalizeEmail } from './emailUtils'

function scopedError(message) {
  return { data: null, error: { message } }
}

async function safeLog(logPromise, context) {
  const { data, error } = await logPromise
  if (error) {
    console.warn('TaskLog:', context, error.message)
  }
  return { data, error }
}

/** All active tasks (any owner). Requires RLS to allow authenticated read. */
export function fetchAllActiveTasks() {
  return supabase
    .from('Tasks')
    .select('*')
    .or('isDeleted.eq.false,isDeleted.is.null')
    .order('id', { ascending: false })
}

export async function insertTask({ taskName, taskDescription, email, userId }) {
  const owner = normalizeEmail(email)
  if (!owner) {
    return scopedError('Missing user email')
  }
  const { data, error } = await supabase
    .from('Tasks')
    .insert({
      Task: taskName,
      Description: taskDescription ?? '',
      email: owner,
      isDeleted: false,
    })
    .select()
    .single()
  if (error) return { data, error }
  if (userId) {
    const descNew = (taskDescription ?? '').trim() || null
    await safeLog(
      Log_insertion({
        userId,
        taskId: data.id,
        titleOld: null,
        titleNew: taskName,
        descOld: null,
        descNew,
        action: 'create',
      }),
      'create',
    )
  }
  return { data, error: null }
}

export async function updateTask(id, fields, ownerEmail, { userId, previous } = {}) {
  const owner = normalizeEmail(ownerEmail)
  if (!owner) {
    return scopedError('Missing user email')
  }
  const { data, error } = await supabase
    .from('Tasks')
    .update(fields)
    .eq('id', id)
    .eq('email', owner)
    .or('isDeleted.eq.false,isDeleted.is.null')
    .select()
  if (error) return { data, error }
  if (!data?.length) {
    return scopedError('Task not found or you do not have permission to update it')
  }
  if (userId && previous) {
    const titleOld = previous.Task ?? null
    const descOld =
      previous.Description != null && String(previous.Description).trim() !== ''
        ? String(previous.Description)
        : null
    const titleNew = fields.Task ?? null
    const descNew =
      fields.Description != null && String(fields.Description).trim() !== ''
        ? String(fields.Description)
        : null
    await safeLog(
      Log_insertion({
        userId,
        taskId: id,
        titleOld,
        titleNew,
        descOld,
        descNew,
        action: 'update',
      }),
      'update',
    )
  }
  return { data, error: null }
}

export async function deleteTask(id, ownerEmail, { userId, previous } = {}) {
  const owner = normalizeEmail(ownerEmail)
  if (!owner) {
    return scopedError('Missing user email')
  }
  const { data, error } = await supabase
    .from('Tasks')
    .update({ isDeleted: true })
    .eq('id', id)
    .eq('email', owner)
    .or('isDeleted.eq.false,isDeleted.is.null')
    .select()
  if (error) return { data, error }
  if (!data?.length) {
    return scopedError('Task not found or you do not have permission to delete it')
  }
  if (userId && previous) {
    const titleOld = previous.Task ?? null
    const descOld =
      previous.Description != null && String(previous.Description).trim() !== ''
        ? String(previous.Description)
        : null
    await safeLog(
      Log_insertion({
        userId,
        taskId: id,
        titleOld,
        titleNew: null,
        descOld,
        descNew: null,
        action: 'delete',
      }),
      'delete',
    )
  }
  return { data, error: null }
}

/** Admin: all tasks (requires RLS allowing this for your admins). */
export function adminFetchAllTasks() {
  return supabase.from('Tasks').select('*').order('id', { ascending: false })
}

/** Admin: update only non-deleted tasks. */
export async function adminUpdateTask(id, fields, { userId, previous }) {
  const { data, error } = await supabase
    .from('Tasks')
    .update(fields)
    .eq('id', id)
    .or('isDeleted.eq.false,isDeleted.is.null')
    .select()
  if (error) return { data, error }
  if (!data?.length) {
    return scopedError('Cannot edit a deleted task. Restore it first.')
  }
  if (userId && previous) {
    const titleOld = previous.Task ?? null
    const descOld =
      previous.Description != null && String(previous.Description).trim() !== ''
        ? String(previous.Description)
        : null
    const titleNew = fields.Task ?? null
    const descNew =
      fields.Description != null && String(fields.Description).trim() !== ''
        ? String(fields.Description)
        : null
    await safeLog(
      Log_insertion({
        userId,
        taskId: id,
        titleOld,
        titleNew,
        descOld,
        descNew,
        action: 'update',
      }),
      'admin_update',
    )
  }
  return { data, error: null }
}

/** Admin: soft-delete any task. */
export async function adminSoftDeleteTask(id, { userId, task }) {
  const { data, error } = await supabase
    .from('Tasks')
    .update({ isDeleted: true })
    .eq('id', id)
    .or('isDeleted.eq.false,isDeleted.is.null')
    .select()
  if (error) return { data, error }
  if (!data?.length) {
    return scopedError('Task not found or already deleted')
  }
  if (userId && task) {
    const titleOld = task.Task ?? null
    const descOld =
      task.Description != null && String(task.Description).trim() !== ''
        ? String(task.Description)
        : null
    await safeLog(
      Log_insertion({
        userId,
        taskId: id,
        titleOld,
        titleNew: null,
        descOld,
        descNew: null,
        action: 'delete',
      }),
      'admin_delete',
    )
  }
  return { data, error: null }
}

/** Admin: restore soft-deleted task. */
export async function adminRestoreTask(id, { userId, task }) {
  const { data, error } = await supabase
    .from('Tasks')
    .update({ isDeleted: false })
    .eq('id', id)
    .eq('isDeleted', true)
    .select()
  if (error) return { data, error }
  if (!data?.length) {
    return scopedError('Task is not deleted or was not found')
  }
  if (userId && task) {
    const titleOld = task.Task ?? null
    const descOld =
      task.Description != null && String(task.Description).trim() !== ''
        ? String(task.Description)
        : null
    await safeLog(
      Log_insertion({
        userId,
        taskId: id,
        titleOld,
        titleNew: titleOld,
        descOld,
        descNew: descOld,
        action: 'restore',
      }),
      'restore',
    )
  }
  return { data, error: null }
}

export function fetchTaskLog(limit = 100) {
  return supabase
    .from('TaskLog')
    .select('*')
    .order('log_id', { ascending: false })
    .limit(limit)
}
