import { supabase } from './supabaseClient'
import { fetchGoogleConnectionStatus } from './profilesApi'

export async function calendarEventViaEdgeFunction(eventData) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    throw new Error('No active session')
  }

  const { connected, error: connectionError } = await fetchGoogleConnectionStatus(session.user.id)
  if (connectionError) {
    console.warn('Google Calendar connection status unavailable:', connectionError.message)
  }
  if (!connected) {
    return { skipped: true, reason: 'Google Calendar is not connected' }
  }

  const response = await fetch(
    `${supabase.supabaseUrl}/functions/v1/calendar-events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to process calendar event')
  }

  return data
}

export async function createCalendarEventViaEdgeFunction(eventData) {
  return calendarEventViaEdgeFunction({
    action: 'create',
    ...eventData,
  })
}

export async function editCalendarEventViaEdgeFunction(eventData) {
  return calendarEventViaEdgeFunction({
    action: 'edit',
    ...eventData,
  })
}

export async function deleteCalendarEventViaEdgeFunction(eventData) {
  return calendarEventViaEdgeFunction({
    action: 'delete',
    ...eventData,
  })
}
