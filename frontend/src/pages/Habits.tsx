import { useEffect, useState } from "react"
import { habitsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Flame, Trophy, Dumbbell } from "lucide-react"
import { cn } from "@/lib/utils"

interface Habit {
  id: string
  name: string
  description: string
  color: string
}

interface HabitWithStreak extends Habit {
  current_streak: number
  longest_streak: number
}

const COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#10b981", label: "Emerald" },
  { value: "#f97316", label: "Orange" },
  { value: "#ef4444", label: "Red" },
]

export default function Habits() {
  const [habits, setHabits] = useState<HabitWithStreak[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitWithStreak | null>(null)

  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formColor, setFormColor] = useState("#6366f1")

  const loadHabits = async () => {
    try {
      const res = await habitsApi.list()
      const habitsData: Habit[] = res.data
      const withStreaks = await Promise.all(
        habitsData.map(async (h) => {
          const streakRes = await habitsApi.getStreak(h.id)
          return { ...h, ...streakRes.data }
        })
      )
      setHabits(withStreaks)
    } catch (err) {
      console.error("Failed to load habits", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHabits()
  }, [])

  const resetForm = () => {
    setFormName("")
    setFormDesc("")
    setFormColor("#6366f1")
  }

  const openEdit = (habit: HabitWithStreak) => {
    setEditingHabit(habit)
    setFormName(habit.name)
    setFormDesc(habit.description)
    setFormColor(habit.color)
  }

  const handleCreate = async () => {
    if (!formName.trim()) return
    try {
      await habitsApi.create({ name: formName.trim(), description: formDesc.trim(), color: formColor })
      setIsCreateOpen(false)
      resetForm()
      await loadHabits()
    } catch (err) {
      console.error("Failed to create habit", err)
    }
  }

  const handleUpdate = async () => {
    if (!editingHabit || !formName.trim()) return
    try {
      await habitsApi.update(editingHabit.id, { name: formName.trim(), description: formDesc.trim(), color: formColor })
      setEditingHabit(null)
      resetForm()
      await loadHabits()
    } catch (err) {
      console.error("Failed to update habit", err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this habit? This cannot be undone.")) return
    try {
      await habitsApi.delete(id)
      await loadHabits()
    } catch (err) {
      console.error("Failed to delete habit", err)
    }
  }

  const HabitForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Habit Name</Label>
        <Input placeholder="e.g. Read 20 pages" value={formName} onChange={(e) => setFormName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea
          placeholder="What does this habit involve?"
          value={formDesc}
          onChange={(e) => setFormDesc(e.target.value)}
          className="h-20"
        />
      </div>
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={cn(
                "w-7 h-7 rounded-full transition-transform duration-150 hover:scale-110",
                formColor === c.value && "ring-2 ring-white ring-offset-2 ring-offset-background scale-110"
              )}
              style={{ backgroundColor: c.value }}
              onClick={() => setFormColor(c.value)}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
        </DialogClose>
        <Button
          size="sm"
          onClick={onSubmit}
          className="bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0"
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Habits</h1>
          <p className="text-muted-foreground text-sm mt-1">{habits.length} habits tracked</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 gap-2">
              <Plus className="w-4 h-4" />
              New Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Habit</DialogTitle></DialogHeader>
            <HabitForm onSubmit={handleCreate} submitLabel="Create Habit" />
          </DialogContent>
        </Dialog>
      </div>

      {habits.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Dumbbell className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-foreground font-medium">No habits yet</p>
          <p className="text-muted-foreground text-sm mt-1">Create your first habit to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((habit) => (
            <div key={habit.id} className="glass-hover rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                  <div>
                    <p className="font-semibold text-foreground">{habit.name}</p>
                    {habit.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{habit.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Dialog open={editingHabit?.id === habit.id} onOpenChange={(open) => { if (!open) { setEditingHabit(null); resetForm() } }}>
                    <DialogTrigger asChild>
                      <button onClick={() => openEdit(habit)} className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Edit Habit</DialogTitle></DialogHeader>
                      <HabitForm onSubmit={handleUpdate} submitLabel="Save Changes" />
                    </DialogContent>
                  </Dialog>
                  <button onClick={() => handleDelete(habit.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 glass rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Current</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{habit.current_streak}</p>
                  <p className="text-[10px] text-muted-foreground">days</p>
                </div>
                <div className="flex-1 glass rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                    <Trophy className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Best</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{habit.longest_streak}</p>
                  <p className="text-[10px] text-muted-foreground">days</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
