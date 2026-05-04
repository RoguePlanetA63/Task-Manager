import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { pingAuthHealth } from '../lib/authHealth'
import * as tasksApi from '../lib/tasksApi'
import { normalizeEmail } from '../lib/emailUtils'

export function useTaskApp() {
  const [conn, setConn] = useState({ status: 'checking', message: '' })
  const [tasks, setTasks] = useState([])
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const userEmail = session?.user?.email ?? ''
  const userId = session?.user?.id ?? null

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      setSession(initial)
      setAuthReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const health = await pingAuthHealth()
      if (cancelled) return

      if (!health.ok) {
        setConn({ status: 'error', message: health.detail })
        return
      }

      const { error: sessionError } = await supabase.auth.getSession()
      if (cancelled) return
      if (sessionError) {
        setConn({
          status: 'error',
          message: `${health.detail}; session check: ${sessionError.message}`,
        })
        return
      }

      setConn({
        status: 'ok',
        message: `${health.detail}; Supabase client initialized (no user signed in yet)`,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadTasks = useCallback(async () => {
    const { data, error } = await tasksApi.fetchAllActiveTasks()
    if (error) {
      console.error(error)
    } else {
      setTasks(data ?? [])
    }
  }, [])

  useEffect(() => {
    if (session) {
      loadTasks()
    }
  }, [session, loadTasks])

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!userEmail) return
    const form = e.target
    const { error } = await tasksApi.insertTask({
      taskName: form.taskName.value,
      taskDescription: form.taskDescription.value,
      email: userEmail,
      userId,
    })
    if (error) {
      console.error(error)
    } else {
      e.target.reset()
      await loadTasks()
    }
  }

  const beginEditTask = (id) => {
    setEditingId(id)
  }

  const cancelEditTask = () => {
    setEditingId(null)
  }

  const handleUpdateTask = async (e, id) => {
    e.preventDefault()
    if (!userEmail) return
    const form = e.target
    const previous = tasks.find((t) => t.id === id)
    const { data, error } = await tasksApi.updateTask(
      id,
      {
        Task: form.taskName.value,
        Description: form.taskDescription.value,
      },
      userEmail,
      previous && userId ? { userId, previous } : {},
    )
    if (error) {
      console.error(error)
    } else if (data) {
      setEditingId(null)
      await loadTasks()
    }
  }

  const handleDeleteTask = async (id) => {
    if (!userEmail) return
    const previous = tasks.find((t) => t.id === id)
    const { data, error } = await tasksApi.deleteTask(
      id,
      userEmail,
      previous && userId ? { userId, previous } : {},
    )
    if (error) {
      console.error(error)
    } else if (data) {
      if (editingId === id) setEditingId(null)
      await loadTasks()
    }
  }

  const isTaskOwner = (task) =>
    Boolean(userEmail && normalizeEmail(task.email) === normalizeEmail(userEmail))

  return {
    conn,
    tasks,
    session,
    authReady,
    userEmail,
    userId,
    editingId,
    handleAddTask,
    beginEditTask,
    cancelEditTask,
    handleUpdateTask,
    handleDeleteTask,
    isTaskOwner,
  }
}
