import { type Notification } from "@/hooks/useNotifications"
import { cn } from "@/lib/utils"

interface AccountabilityModalProps {
  notification: Notification
  onDismiss: (id: string) => void
}

export default function AccountabilityModal({ notification, onDismiss }: AccountabilityModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 max-w-lg w-full mx-6 animate-fade-in-up">
        {/* Top bar — stark red */}
        <div className="h-1 w-full bg-red-600 rounded-t-sm" />

        <div className="bg-zinc-950 border border-zinc-800 rounded-b-2xl p-8 md:p-10 shadow-[0_20px_80px_rgba(0,0,0,0.9)]">
          {/* Context header */}
          <div className="mb-6">
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 mb-2">
              Streak broken
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-red-500 tabular-nums">
                {notification.streak_count}
              </span>
              <span className="text-sm font-semibold text-zinc-400">
                day streak on
              </span>
              <span className="text-lg font-bold text-zinc-200">
                {notification.habit_name}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-zinc-800 mb-6" />

          {/* AI message */}
          <blockquote className="text-lg md:text-xl leading-relaxed font-medium text-zinc-100 tracking-tight mb-8">
            {notification.message}
          </blockquote>

          {/* Actions */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => onDismiss(notification.id)}
              className={cn(
                "w-full py-3.5 px-6 rounded-xl text-base font-bold tracking-wide",
                "bg-zinc-100 text-zinc-950 hover:bg-white",
                "transition-all duration-200 hover:-translate-y-0.5",
                "shadow-[0_4px_14px_rgba(255,255,255,0.1)]"
              )}
            >
              I hear you. Back to it.
            </button>
            <button
              onClick={() => onDismiss(notification.id)}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-medium tracking-wide py-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
