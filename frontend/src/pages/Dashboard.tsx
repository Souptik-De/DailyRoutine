import { useEffect, useState, useCallback } from "react"
import { format } from "date-fns"
import { habitsApi, completionsApi } from "@/lib/api"
import { Checkbox } from "@/components/ui/checkbox"
import { BookOpen, Flame, TrendingUp, CheckCircle2, Circle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Link } from "react-router-dom"

interface Habit {
  id: string
  name: string
  description: string
  color: string
}

interface Streak {
  current_streak: number
  longest_streak: number
}

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd")
  const todayDisplay = format(new Date(), "EEEE, MMMM d")

  const [habits, setHabits] = useState<Habit[]>([])
  const [streaks, setStreaks] = useState<Record<string, Streak>>({})
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [habitsRes, completionsRes] = await Promise.all([
        habitsApi.list(),
        completionsApi.getForDate(today),
      ])
      const habitsData: Habit[] = habitsRes.data
      setHabits(habitsData)
      setCompleted(new Set(completionsRes.data.completed_habit_ids))

      // Load streaks in parallel
      const streakResults = await Promise.all(
        habitsData.map((h) => habitsApi.getStreak(h.id).then((r) => ({ id: h.id, ...r.data })))
      )
      const streakMap: Record<string, Streak> = {}
      streakResults.forEach(({ id, current_streak, longest_streak }) => {
        streakMap[id] = { current_streak, longest_streak }
      })
      setStreaks(streakMap)
    } catch (err) {
      console.error("Failed to load dashboard data", err)
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleHabit = async (habitId: string, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        await completionsApi.markIncomplete(today, habitId)
        setCompleted((prev) => {
          const next = new Set(prev)
          next.delete(habitId)
          return next
        })
      } else {
        await completionsApi.markComplete(today, habitId)
        setCompleted((prev) => new Set([...prev, habitId]))
      }
      // Refresh streaks for this habit
      const streakRes = await habitsApi.getStreak(habitId)
      setStreaks((prev) => ({
        ...prev,
        [habitId]: { current_streak: streakRes.data.current_streak, longest_streak: streakRes.data.longest_streak },
      }))
    } catch (err) {
      console.error("Failed to toggle habit", err)
    }
  }

  const completionRate = habits.length > 0 ? Math.round((completed.size / habits.length) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Today</p>
        <h1 className="text-3xl font-bold text-foreground mt-1">{todayDisplay}</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed Today
          </div>
          <p className="text-2xl font-bold text-foreground">
            {completed.size}<span className="text-muted-foreground text-lg">/{habits.length}</span>
          </p>
          <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            Best Current Streak
          </div>
          <p className="text-2xl font-bold text-foreground">
            {Math.max(0, ...Object.values(streaks).map((s) => s.current_streak))}
            <span className="text-sm text-orange-400 ml-1">days</span>
          </p>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            All-Time Longest
          </div>
          <p className="text-2xl font-bold text-foreground">
            {Math.max(0, ...Object.values(streaks).map((s) => s.longest_streak))}
            <span className="text-sm text-emerald-400 ml-1">days</span>
          </p>
        </div>
      </div>

      {/* Habits checklist */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Today's Habits</h2>
        <div className="space-y-3">
          {habits.map((habit) => {
            const isCompleted = completed.has(habit.id)
            const streak = streaks[habit.id]
            return (
              <div
                key={habit.id}
                className={cn(
                  "glass-hover rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-200",
                  isCompleted && "border-violet-500/20 bg-violet-500/5"
                )}
                onClick={() => toggleHabit(habit.id, isCompleted)}
              >
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={() => toggleHabit(habit.id, isCompleted)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div
                  className="w-2 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: habit.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium text-foreground", isCompleted && "line-through text-muted-foreground")}>
                    {habit.name}
                  </p>
                  {habit.description && (
                    <p className="text-xs text-muted-foreground truncate">{habit.description}</p>
                  )}
                </div>
                {streak && (
                  <div className="flex items-center gap-1 text-xs text-orange-400 flex-shrink-0">
                    <Flame className="w-3.5 h-3.5" />
                    <span className="font-semibold">{streak.current_streak}</span>
                    <span className="text-muted-foreground">streak</span>
                  </div>
                )}
                {isCompleted && <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />}
                {!isCompleted && <Circle className="w-4 h-4 text-white/10 flex-shrink-0" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Journal shortcut */}
      <Link to="/journal">
        <div className="glass-hover rounded-xl p-5 flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <p className="font-medium text-foreground">Today's Journal</p>
              <p className="text-xs text-muted-foreground">Write your daily reflection</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
        </div>
      </Link>
    </div>
  )
}
