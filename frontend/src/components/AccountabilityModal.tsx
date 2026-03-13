import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TrendingUp, BookOpen, Calendar } from "lucide-react"
import { type Notification } from "@/hooks/useNotifications.tsx"
import { format } from "date-fns"

interface AccountabilityModalProps {
  notification: Notification
  onClose: () => void
}

export default function AccountabilityModal({
  notification,
  onClose,
}: AccountabilityModalProps) {
  const [showJournalRef, setShowJournalRef] = useState(false)

  return (
    <Dialog open={!!notification} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#0a0a0a] border-green-900/50 shadow-2xl shadow-green-900/20 p-8">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-green-950/50 border border-green-500/30">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-green-500 tracking-tight">
              Ruthless Accountability
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-green-950/20 border border-green-900/30 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50" />
            <p className="text-xl text-green-50 leading-relaxed font-medium italic">
              "{notification.message}"
            </p>
          </div>

          <div className="flex items-center justify-between text-sm text-green-500/60 px-2 uppercase tracking-widest font-semibold">
            <span>Missed: {notification.habit_name}</span>
            <span>Streak: {notification.streak_count} days</span>
          </div>

          {notification.journal_reference && (
            <div 
              onClick={() => setShowJournalRef(true)}
              className="mt-6 p-4 rounded-lg bg-[#111] border border-green-900/20 hover:border-green-500/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-green-500/40 font-mono">REFERENCED JOURNAL ENTRY</span>
                <BookOpen className="w-4 h-4 text-green-500/30 group-hover:text-green-500/60" />
              </div>
              <p className="text-sm text-green-100/60 line-clamp-2 italic">
                {notification.journal_reference.content_snippet}
              </p>
              <div className="mt-2 text-right">
                <span className="text-[10px] text-green-500/30 font-mono uppercase tracking-tighter">Click to see full entry</span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-black font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-green-900/40"
            >
              I HEAR YOU. BACK TO IT.
            </button>
          </div>
        </div>
      </DialogContent>

      {/* Full Journal Entry Dialog */}
      <Dialog open={showJournalRef} onOpenChange={setShowJournalRef}>
        <DialogContent className="max-w-xl bg-[#0a0a0a] border-green-900/50 shadow-2xl p-8">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2 text-green-500/60">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-widest">
                Journal Entry — {notification.journal_reference?.date}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-green-400">
              Detailed Context
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 p-6 rounded-lg bg-green-950/10 border border-green-950 text-green-50 leading-relaxed italic">
            {notification.journal_reference?.content}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
