import { useState } from "react"
import { format } from "date-fns"
import { type Notification } from "@/hooks/useNotifications"
import { cn } from "@/lib/utils"
import { Calendar } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AccountabilityModalProps {
  notification: Notification
  onDismiss: (id: string) => void
}

export default function AccountabilityModal({ notification, onDismiss }: AccountabilityModalProps) {
  const [showJournal, setShowJournal] = useState(false)

  // Handle the 'I hear you' button which should dismiss the notification itself
  const handleAcknowledge = () => {
    onDismiss(notification.id)
  }

  // Format date if it exists
  const formattedDate = notification.journal_reference?.date 
    ? format(new Date(notification.journal_reference.date + "T00:00:00"), "EEEE, MMMM d, yyyy")
    : "Referenced Journal Entry"

  return (
    <>
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
            <div className="text-lg md:text-xl leading-relaxed font-medium text-zinc-100 tracking-tight mb-8">
              {notification.message}
            </div>

            {/* Journal Reference (if any) - Now Clickable */}
            {notification.journal_reference && (
              <button 
                onClick={() => setShowJournal(true)}
                className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all rounded-xl p-4 mb-8 group cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    Referenced Journal Entry
                  </p>
                  <span className="text-xs text-zinc-500 font-medium bg-zinc-800 group-hover:bg-zinc-700 transition-colors px-2 py-0.5 rounded-full">
                    {notification.journal_reference.date}
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-300 italic opacity-80 line-clamp-2">
                  "...{notification.journal_reference.content_snippet}..."
                </p>
                <p className="text-xs text-brand-400 mt-2 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to read full entry →
                </p>
              </button>
            )}

            {/* Actions */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleAcknowledge}
                className={cn(
                  "w-full py-3.5 px-6 rounded-xl text-base font-bold tracking-wide",
                  "bg-zinc-100 text-zinc-950 hover:bg-white",
                  "transition-all duration-200 hover:-translate-y-0.5",
                  "shadow-[0_4px_14px_rgba(255,255,255,0.1)]"
                )}
              >
                I hear you. Back to it.
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Journal Dialog */}
      <Dialog open={showJournal} onOpenChange={setShowJournal}>
        <DialogContent className="max-w-md z-[110]">
          {notification.journal_reference && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-300" />
                  {formattedDate}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                    Journal Entry
                  </span>
                  <div className="text-sm text-foreground/90 leading-relaxed bg-white/5 rounded-2xl p-4 border border-white/5 max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {notification.journal_reference.content}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
