import { useEffect, useState, useCallback } from "react"
import { format } from "date-fns"
import { journalsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
    if (!confirm("Delete today's journal entry?")) return
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
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-pink-400" />
            <h1 className="text-3xl font-bold text-foreground">Journal</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{todayDisplay}</p>
        </div>
        {entry && (
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Word count & status */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
        {entry && (
          <span>Last saved: {format(new Date(entry.updated_at), "h:mm a")}</span>
        )}
      </div>

      {/* Editor */}
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setSaved(false) }}
          placeholder="What's on your mind today? Reflect on your goals, feelings, and experiences..."
          className="min-h-[420px] text-base leading-relaxed p-5 rounded-xl border-white/10 bg-white/3 resize-none focus-visible:ring-pink-500/40"
        />
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className={cn(
            "gap-2",
            saved
              ? "bg-emerald-500 hover:bg-emerald-600 text-white border-0"
              : "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
          )}
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Saved!</>
          ) : saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4" /> {entry ? "Update Entry" : "Save Entry"}</>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          {entry ? "Entry exists for today" : "No entry yet for today"}
        </span>
      </div>
    </div>
  )
}
