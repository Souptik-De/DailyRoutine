import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { notificationsApi } from "@/lib/api"

export interface Notification {
  id: string
  habit_id: string
  habit_name: string
  streak_count: number
  message: string
  journal_reference: {
    id: string
    date: string
    content: string
    content_snippet: string
  } | null
  delivered_at: string
  seen_at: string | null
}

interface NotificationsContextType {
  notification: Notification | null
  markSeen: (id: string) => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

const POLL_INTERVAL = 30_000

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await notificationsApi.getUnseen()
      const unseen: Notification[] = res.data
      if (unseen.length > 0) {
        setNotification(unseen[0])
      } else {
        setNotification(null)
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    poll()
    timerRef.current = setInterval(poll, POLL_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [poll])

  const markSeen = useCallback(
    async (id: string) => {
      try {
        await notificationsApi.markSeen(id)
        setNotification(null)
      } catch (e) {
        console.error("Failed to mark notification as seen", e)
      }
    },
    []
  )

  return (
    <NotificationsContext.Provider value={{ notification, markSeen }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider")
  }
  return context
}
