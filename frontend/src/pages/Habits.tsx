import { useEffect, useState } from "react"
import { habitsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from "@/components/ui/dialog"
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
    <div className="animate-fade-in-up space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Habits</h1>
          <p className="text-muted-foreground text-sm mt-2">{habits.length} habits tracked</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 text-white border-0 shadow-[0_4px_14px_0_rgba(139,92,246,0.39)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.23)] hover:-translate-y-0.5 transition-all duration-200 gap-2 h-11 px-6 rounded-xl font-semibold">
              <Plus className="w-5 h-5" />
              New Habit
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 sm:rounded-2xl">
            <DialogHeader><DialogTitle className="text-xl font-bold">Create New Habit</DialogTitle></DialogHeader>
            <HabitForm onSubmit={handleCreate} submitLabel="Create Habit" />
          </DialogContent>
        </Dialog>
      </div>

      {habits.length === 0 ? (
        <div className="glass rounded-3xl p-16 text-center border-dashed border-2 border-white/10">
          <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Dumbbell className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <p className="text-xl text-foreground font-bold">No habits yet</p>
          <p className="text-muted-foreground mt-2">Create your first habit to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {habits.map((habit, i) => (
            <div 
              key={habit.id} 
              className="glass-hover rounded-2xl p-6 flex flex-col gap-5 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.4)] transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none" style={{ backgroundColor: habit.color }} />
              
              <div className="flex items-start justify-between gap-2 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-8 rounded-full flex-shrink-0 shadow-lg" style={{ backgroundColor: habit.color, boxShadow: `0 0 15px ${habit.color}60` }} />
                  <div>
                    <p className="text-lg font-bold text-foreground group-hover:text-white transition-colors">{habit.name}</p>
                    {habit.description && (
                      <p className="text-sm text-muted-foreground/80 mt-1 line-clamp-2">{habit.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Dialog open={editingHabit?.id === habit.id} onOpenChange={(open) => { if (!open) { setEditingHabit(null); resetForm() } }}>
                    <DialogTrigger asChild>
                      <button onClick={() => openEdit(habit)} className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="glass border-white/10 sm:rounded-2xl">
                      <DialogHeader><DialogTitle className="text-xl font-bold">Edit Habit</DialogTitle></DialogHeader>
                      <HabitForm onSubmit={handleUpdate} submitLabel="Save Changes" />
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass border-white/10 sm:rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Habit</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this habit? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/10 cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(habit.id)} className="bg-red-500 hover:bg-red-600 text-white cursor-pointer">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="flex gap-4 relative z-10 mt-2">
                <div className="flex-1 bg-black/20 rounded-xl p-4 text-center border border-white/5 group-hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-center gap-1.5 text-orange-400 mb-2">
                    <Flame className="w-4 h-4" />
                    <span className="text-xs font-bold tracking-wider uppercase">Current</span>
                  </div>
                  <p className="text-2xl font-black text-foreground">{habit.current_streak}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">days</p>
                </div>
                <div className="flex-1 bg-black/20 rounded-xl p-4 text-center border border-white/5 group-hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-center gap-1.5 text-yellow-400 mb-2">
                    <Trophy className="w-4 h-4" />
                    <span className="text-xs font-bold tracking-wider uppercase">Best</span>
                  </div>
                  <p className="text-2xl font-black text-foreground">{habit.longest_streak}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">days</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
