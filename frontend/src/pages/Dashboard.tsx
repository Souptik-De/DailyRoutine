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
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest text-violet-400/80 mb-1">Today</p>
        <h1 className="text-4xl font-extrabold text-foreground tracking-tight">{todayDisplay}</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="glass-hover rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-colors duration-500" />
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold tracking-wider uppercase mb-3 relative z-10">
            <CheckCircle2 className="w-4 h-4 text-violet-400" />
            Completed
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-black text-foreground">
              {completed.size}<span className="text-muted-foreground text-xl font-bold ml-1">/ {habits.length}</span>
            </p>
            <div className="mt-4 h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${completionRate}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-hover rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-colors duration-500" />
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold tracking-wider uppercase mb-3 relative z-10">
            <Flame className="w-4 h-4 text-orange-400" />
            Best Streak
          </div>
          <p className="text-3xl font-black text-foreground relative z-10">
            {Math.max(0, ...Object.values(streaks).map((s) => s.current_streak))}
            <span className="text-base text-orange-400 font-bold ml-1.5">days</span>
          </p>
        </div>

        <div className="glass-hover rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors duration-500" />
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold tracking-wider uppercase mb-3 relative z-10">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            All-Time Longest
          </div>
          <p className="text-3xl font-black text-foreground relative z-10">
            {Math.max(0, ...Object.values(streaks).map((s) => s.longest_streak))}
            <span className="text-base text-emerald-400 font-bold ml-1.5">days</span>
          </p>
        </div>
      </div>

      {/* Habits checklist */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-6 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-full" />
          Today's Routine
        </h2>
        <div className="space-y-3">
          {habits.map((habit, i) => {
            const isCompleted = completed.has(habit.id)
            const streak = streaks[habit.id]
            const hotStreak = streak && streak.current_streak >= 3
            return (
              <div
                key={habit.id}
                className={cn(
                  "glass-hover rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-300 group",
                  isCompleted 
                    ? "border-violet-500/30 bg-violet-500/10 shadow-[0_4px_20px_rgba(139,92,246,0.1)]" 
                    : "hover:translate-x-1"
                )}
                style={{ animationDelay: `${250 + i * 50}ms` }}
                onClick={() => toggleHabit(habit.id, isCompleted)}
              >
                <div className="relative">
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => toggleHabit(habit.id, isCompleted)}
                    onClick={(e) => e.stopPropagation()}
                    className={cn("w-6 h-6 rounded-full border-2 transition-all duration-300", isCompleted && "border-violet-400 bg-violet-500 text-white")}
                  />
                  {isCompleted && (
                    <div className="absolute inset-0 bg-violet-400 rounded-full blur-md opacity-40 animate-pulse pointer-events-none" />
                  )}
                </div>
                <div
                  className="w-1.5 h-10 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: habit.color, boxShadow: `0 0 10px ${habit.color}50` }}
                />
                <div className="flex-1 min-w-0 py-1">
                  <p className={cn("text-lg font-semibold transition-all duration-300", isCompleted ? "text-muted-foreground line-through" : "text-foreground group-hover:text-violet-200")}>
                    {habit.name}
                  </p>
                  {habit.description && (
                    <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{habit.description}</p>
                  )}
                </div>
                {streak && streak.current_streak > 0 && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 transition-all duration-300",
                    hotStreak ? "bg-orange-500/10 ring-1 ring-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)]" : "bg-white/5 text-muted-foreground"
                  )}>
                    <Flame className={cn("w-3.5 h-3.5", hotStreak && "animate-pulse")} />
                    <span className="font-bold text-sm tracking-wide">{streak.current_streak}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Journal shortcut */}
      <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <Link to="/journal" className="block outline-none group">
          <div className="glass-hover rounded-2xl p-6 flex items-center justify-between cursor-pointer relative overflow-hidden ring-1 ring-white/5 group-hover:ring-pink-500/30 transition-all duration-500 group-focus-visible:ring-pink-500">
            <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-pink-500/10 to-transparent translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-700" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.2)] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <BookOpen className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground group-hover:text-pink-100 transition-colors">Today's Journal</p>
                <p className="text-sm text-muted-foreground font-medium mt-0.5">Write your daily reflection</p>
              </div>
            </div>
            <div className="relative z-10 bg-white/5 p-3 rounded-full group-hover:bg-pink-500/20 group-hover:text-pink-300 transition-colors">
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-pink-300 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
