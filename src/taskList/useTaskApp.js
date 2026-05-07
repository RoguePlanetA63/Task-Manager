import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { pingAuthHealth } from '../lib/authHealth'
import * as tasksApi from '../lib/tasksApi'
import { normalizeEmail } from '../lib/emailUtils'
import { createCalendarEventViaEdgeFunction, editCalendarEventViaEdgeFunction, deleteCalendarEventViaEdgeFunction } from '../lib/calendarEdgeFunctionApi'

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
    const taskName = form.taskName.value
    const taskDescription = form.taskDescription.value
    const startTime = form.taskStartAt?.value
    const endTime = form.taskEndAt?.value

    const { data, error } = await tasksApi.insertTask({
      taskName,
      taskDescription,
      email: userEmail,
      userId,
      startAt: startTime ? new Date(startTime).toISOString() : null,
      endAt: endTime ? new Date(endTime).toISOString() : null,
    })

    if (error) {
      console.error(error)
      return
    }

    // Try to sync to Google Calendar if user has connected it and times provided
    if (data?.id && startTime && endTime) {
      try {
        const eventResponse = await createCalendarEventViaEdgeFunction({
          calendar_id: 'primary',
          summary: taskName,
          description: taskDescription,
          start: new Date(startTime).toISOString(),
          end: new Date(endTime).toISOString(),
        })

        // Update task with google_event_id
        if (eventResponse?.event?.id) {
          await tasksApi.updateTask(
            data.id,
            { google_event_id: eventResponse.event.id },
            userEmail,
            { userId, previous: data }
          )
        }
      } catch (calendarError) {
        console.warn('Calendar sync failed:', calendarError.message)
      }
    }

    e.target.reset()
    await loadTasks()
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
    const newTitle = form.taskName.value
    const newDescription = form.taskDescription.value

    const { data, error } = await tasksApi.updateTask(
      id,
      {
        Task: newTitle,
        Description: newDescription,
      },
      userEmail,
      previous && userId ? { userId, previous } : {},
    )

    if (error) {
      console.error(error)
      return
    }

    if (data) {
      // Sync calendar event if it exists
      if (previous?.google_event_id) {
        try {
          await editCalendarEventViaEdgeFunction({
            calendar_id: 'primary',
            event_id: previous.google_event_id,
            summary: newTitle,
            description: newDescription,
            start: previous.start_at,
            end: previous.end_at,
          })
        } catch (calendarError) {
          console.warn('Calendar event update failed:', calendarError.message)
        }
      }

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
      return
    }

    if (data) {
      // Delete calendar event if it exists
      if (previous?.google_event_id) {
        try {
          await deleteCalendarEventViaEdgeFunction({
            calendar_id: 'primary',
            event_id: previous.google_event_id,
          })
        } catch (calendarError) {
          console.warn('Calendar event deletion failed:', calendarError.message)
        }
      }

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
