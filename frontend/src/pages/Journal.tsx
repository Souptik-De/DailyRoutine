import { useEffect, useState, useCallback } from "react"
import { format } from "date-fns"
import { journalsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Save, Trash2, BookOpen, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface JournalEntry {
  id: string
  content: string
  date: string
  created_at: string
  updated_at: string
}

export default function Journal() {
  const today = format(new Date(), "yyyy-MM-dd")
  const todayDisplay = format(new Date(), "EEEE, MMMM d, yyyy")

  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadEntry = useCallback(async () => {
    try {
      const res = await journalsApi.getByDate(today)
      setEntry(res.data)
      setContent(res.data.content)
    } catch (err: unknown) {
      // 404 = no entry yet, that's fine
      if ((err as { response?: { status?: number } })?.response?.status !== 404) {
        console.error("Failed to load journal entry", err)
      }
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    loadEntry()
  }, [loadEntry])

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      if (entry) {
        await journalsApi.update(entry.id, content)
      } else {
        const res = await journalsApi.create({ content, date: today })
        setEntry(res.data)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error("Failed to save journal entry", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!entry) return
    try {
      await journalsApi.delete(entry.id)
      setEntry(null)
      setContent("")
    } catch (err) {
      console.error("Failed to delete journal entry", err)
    }
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-8 max-w-3xl mx-auto pb-12">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.15)] overflow-hidden relative">
              <div className="absolute inset-0 bg-white/5" />
              <BookOpen className="w-6 h-6 text-pink-400 relative z-10" />
            </div>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Journal</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium tracking-wide ml-[60px]">{todayDisplay}</p>
        </div>
        {entry && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-3 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors group">
                <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass border-white/10 sm:rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete today's journal entry? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/10 cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white cursor-pointer">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Word count & status */}
      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground px-2">
        <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
        {entry && (
          <span className="flex items-center gap-1.5 opacity-80">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Last saved: {format(new Date(entry.updated_at), "h:mm a")}
          </span>
        )}
      </div>

      {/* Editor */}
      <div className="relative group">
        <Textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setSaved(false) }}
          placeholder="What's on your mind today? Reflect on your goals, feelings, and experiences..."
          className="min-h-[500px] text-lg leading-relaxed p-8 rounded-3xl border-white/10 bg-black/40 resize-none focus-visible:ring-1 focus-visible:ring-pink-500/50 shadow-[0_8px_40px_rgba(0,0,0,0.3)] focus-visible:shadow-[0_0_40px_rgba(236,72,153,0.3)] backdrop-blur-3xl transition-all duration-300 relative z-10 placeholder:text-muted-foreground/30 font-medium"
        />
      </div>

      {/* Save button */}
      <div className="flex items-center gap-4 px-2">
        <Button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className={cn(
            "gap-2 h-12 px-8 rounded-xl font-bold shadow-[0_4px_14px_0_rgba(236,72,153,0.39)] hover:shadow-[0_6px_20px_rgba(236,72,153,0.23)] hover:-translate-y-0.5 transition-all duration-200 text-base",
            saved
              ? "bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-[0_4px_14px_0_rgba(16,185,129,0.39)]"
              : "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
          )}
        >
          {saved ? (
            <><CheckCircle2 className="w-5 h-5" /> Saved!</>
          ) : saving ? (
            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-5 h-5" /> {entry ? "Update Entry" : "Save Entry"}</>
          )}
        </Button>
        <span className="text-sm font-medium text-muted-foreground/80">
          {entry ? "Entry exists for today" : "No entry yet for today"}
        </span>
      </div>
    </div>
  )
}
