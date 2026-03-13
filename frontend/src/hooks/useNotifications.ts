import { useEffect, useState, useCallback, useRef } from "react"
import { notificationsApi } from "@/lib/api"

export interface Notification {
  id: string
  habit_id: string
  habit_name: string
  streak_count: number
  message: string
  delivered_at: string
  seen_at: string | null
}

const POLL_INTERVAL = 30_000 // 30 seconds

export function useNotifications() {
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
      // Silently fail — not critical
    }
  }, [])

  useEffect(() => {
    poll() // initial check
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

  return { notification, markSeen }
}
