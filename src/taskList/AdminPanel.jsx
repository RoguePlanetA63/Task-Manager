import { useCallback, useEffect, useMemo, useState } from 'react'
import * as tasksApi from '../lib/tasksApi'

function isTaskDeleted(task) {
  return task.isDeleted === true
}

export default function AdminPanel({ session }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterDeleted, setFilterDeleted] = useState('active')
  const [sortKey, setSortKey] = useState('id')
  const [sortDir, setSortDir] = useState('desc')
  const [editing, setEditing] = useState(null)
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [logs, setLogs] = useState([])
  const [logHint, setLogHint] = useState('')

  const userId = session?.user?.id ?? null

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    const { data, error } = await tasksApi.adminFetchAllTasks()
    setLoading(false)
    if (error) {
      setLoadError(error.message)
      setRows([])
    } else {
      setRows(data ?? [])
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200)
    return () => clearTimeout(t)
  }, [search])

  const refreshLogs = useCallback(async () => {
    setLogHint('')
    const { data, error } = await tasksApi.fetchTaskLog(80)
    if (error) {
      setLogs([])
      setLogHint(
        'Audit log unavailable (add a TaskLog table or adjust RLS). ' + error.message,
      )
    } else {
      setLogs(data ?? [])
    }
  }, [])

  useEffect(() => {
    refreshLogs()
  }, [refreshLogs])

  const filteredSorted = useMemo(() => {
    let list = [...rows]
    if (filterDeleted === 'active') {
      list = list.filter((t) => !isTaskDeleted(t))
    } else if (filterDeleted === 'deleted') {
      list = list.filter((t) => isTaskDeleted(t))
    }
    if (debouncedSearch) {
      list = list.filter((t) => {
        const hay = `${t.Task ?? ''} ${t.Description ?? ''} ${t.email ?? ''} ${t.id}`.toLowerCase()
        return hay.includes(debouncedSearch)
      })
    }
    const mult = sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'boolean' && typeof vb === 'boolean') {
        return (va === vb ? 0 : va ? 1 : -1) * mult
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return va < vb ? -mult : va > vb ? mult : 0
      }
      return String(va).localeCompare(String(vb), undefined, { numeric: true }) * mult
    })
    return list
  }, [rows, filterDeleted, debouncedSearch, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'id' ? 'desc' : 'asc')
    }
  }

  function sortLabel(key) {
    if (sortKey !== key) return 'Sort'
    return sortDir === 'asc' ? 'Asc' : 'Desc'
  }

  function openRow(task) {
    setFormError('')
    setEditing({ ...task })
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setFormError('')
    const task = editing
    if (!task) return
    if (isTaskDeleted(task)) {
      setFormError('Cannot edit a deleted task. Restore it first.')
      return
    }
    const fd = new FormData(e.target)
    const Task = fd.get('Task')
    const Description = fd.get('Description') ?? ''
    const { data, error } = await tasksApi.adminUpdateTask(
      task.id,
      { Task, Description },
      userId ? { userId, previous: task } : {},
    )
    if (error) {
      setFormError(error.message)
      return
    }
    if (data) {
      setEditing(null)
      await refresh()
      await refreshLogs()
    }
  }

  async function handleSoftDelete(task) {
    setActionError('')
    const { error } = await tasksApi.adminSoftDeleteTask(task.id, userId ? { userId, task } : {})
    if (error) {
      setActionError(error.message)
      return
    }
    if (editing?.id === task.id) setEditing(null)
    await refresh()
    await refreshLogs()
  }

  async function handleRestore(task) {
    setActionError('')
    const { error } = await tasksApi.adminRestoreTask(task.id, userId ? { userId, task } : {})
    if (error) {
      setActionError(error.message)
      return
    }
    await refresh()
    await refreshLogs()
  }

  return (
    <div className="admin-panel">
      <header className="admin-panel__header">
        <h1 className="admin-panel__title">Admin</h1>
        <p className="admin-panel__lead">
          All tasks across users. Editing is blocked for soft-deleted rows until you restore them.
        </p>
      </header>

      {loadError ? (
        <p className="admin-panel__error" role="alert">
          {loadError} — check Supabase RLS allows admins to read <code>Tasks</code>.
        </p>
      ) : null}
      {actionError ? (
        <p className="admin-panel__error" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="admin-toolbar">
        <label className="admin-toolbar__search">
          <span className="visually-hidden">Search tasks</span>
          <input
            type="search"
            placeholder="Search title, description, email, id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="admin-toolbar__filters">
          <span className="admin-toolbar__label">Show:</span>
          {[
            ['active', 'Active'],
            ['deleted', 'Deleted'],
            ['all', 'All'],
          ].map(([value, label]) => (
            <label key={value} className="admin-radio">
              <input
                type="radio"
                name="admin-filter"
                value={value}
                checked={filterDeleted === value}
                onChange={() => setFilterDeleted(value)}
              />
              {label}
            </label>
          ))}
        </div>
        <button type="button" className="admin-refresh" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <button type="button" className="admin-th-btn" onClick={() => toggleSort('id')}>
                  ID <span className="admin-th-sort">{sortLabel('id')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="admin-th-btn" onClick={() => toggleSort('Task')}>
                  Task <span className="admin-th-sort">{sortLabel('Task')}</span>
                </button>
              </th>
              <th>Description</th>
              <th>
                <button type="button" className="admin-th-btn" onClick={() => toggleSort('email')}>
                  Owner email <span className="admin-th-sort">{sortLabel('email')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="admin-th-btn" onClick={() => toggleSort('isDeleted')}>
                  Deleted <span className="admin-th-sort">{sortLabel('isDeleted')}</span>
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-table__empty">
                  {loading ? 'Loading…' : 'No tasks match this filter or search.'}
                </td>
              </tr>
            ) : (
              filteredSorted.map((task) => (
                <tr
                  key={task.id}
                  className={
                    isTaskDeleted(task) ? 'admin-table__row admin-table__row--deleted' : 'admin-table__row'
                  }
                  onClick={() => openRow(task)}
                  title="Open details"
                >
                  <td>{task.id}</td>
                  <td>{task.Task}</td>
                  <td className="admin-table__desc">{task.Description}</td>
                  <td>{task.email}</td>
                  <td>{isTaskDeleted(task) ? 'Yes' : 'No'}</td>
                  <td className="admin-table__actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="admin-row-btn"
                      onClick={() => openRow(task)}
                    >
                      {isTaskDeleted(task) ? 'View' : 'Edit'}
                    </button>
                    {isTaskDeleted(task) ? (
                      <button
                        type="button"
                        className="admin-row-btn admin-row-btn--restore"
                        onClick={() => void handleRestore(task)}
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-row-btn admin-row-btn--danger"
                        onClick={() => void handleSoftDelete(task)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="admin-audit">
        <h2 className="admin-audit__title">Audit log</h2>
        {logHint ? (
          <p className="admin-audit__hint" role="status">
            {logHint}
          </p>
        ) : null}
        <div className="admin-table-wrap admin-table-wrap--log">
          <table className="admin-table admin-table--compact">
            <thead>
              <tr>
                <th>log_id</th>
                <th>Task id</th>
                <th>action</th>
                <th>user_id</th>
                <th>timestamp</th>
                <th>old_value</th>
                <th>new_value</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-table__empty">
                    No log entries yet.
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.log_id ?? `${row.id}-${row.timestamp}`}>
                    <td>{row.log_id}</td>
                    <td>{row.id}</td>
                    <td>{row.action}</td>
                    <td className="admin-table__mono">{row.user_id}</td>
                    <td>{row.timestamp}</td>
                    <td className="admin-table__json">{JSON.stringify(row.old_value)}</td>
                    <td className="admin-table__json">{JSON.stringify(row.new_value)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={() => setEditing(null)}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="admin-modal-title" className="admin-modal__title">
              Task #{editing.id}
              {isTaskDeleted(editing) ? (
                <span className="admin-modal__badge">Deleted</span>
              ) : null}
            </h2>
            <p className="admin-modal__meta">Owner: {editing.email}</p>

            {isTaskDeleted(editing) ? (
              <p className="admin-modal__warn">
                This task is deleted. Restore it from the table before editing.
              </p>
            ) : (
              <form className="admin-modal__form" onSubmit={(e) => void handleSaveEdit(e)}>
                {formError ? (
                  <p className="admin-panel__error" role="alert">
                    {formError}
                  </p>
                ) : null}
                <label htmlFor="admin-edit-task">Task</label>
                <input
                  id="admin-edit-task"
                  name="Task"
                  type="text"
                  defaultValue={editing.Task}
                  required
                />
                <label htmlFor="admin-edit-desc">Description</label>
                <input
                  id="admin-edit-desc"
                  name="Description"
                  type="text"
                  defaultValue={editing.Description ?? ''}
                />
                <div className="admin-modal__actions">
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="admin-modal__footer-actions">
              {isTaskDeleted(editing) ? (
                <button
                  type="button"
                  className="admin-row-btn admin-row-btn--restore"
                  onClick={() => void handleRestore(editing)}
                >
                  Restore
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-row-btn admin-row-btn--danger"
                  onClick={() => void handleSoftDelete(editing)}
                >
                  Soft delete
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
