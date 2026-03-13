import { useEffect, useState, useCallback } from "react"
import { format, subDays, addDays } from "date-fns"
import { habitsApi, completionsApi } from "@/lib/api"
import { Checkbox } from "@/components/ui/checkbox"
import { BookOpen, Flame, Trophy, TrendingUp, CheckCircle2, ArrowRight, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { Link } from "react-router-dom"
import { useNotifications } from "@/hooks/useNotifications.tsx"

interface Habit {
  id: string
  name: string
  description: string
  color: string
  is_active?: boolean
}

interface Streak {
  current_streak: number
  longest_streak: number
}

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd")
  const displayDate = format(selectedDate, "EEEE, MMMM d")
  const isToday = format(new Date(), "yyyy-MM-dd") === selectedDateStr

  const [habits, setHabits] = useState<Habit[]>([])
  const [streaks, setStreaks] = useState<Record<string, Streak>>({})
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [habitsRes, completionsRes] = await Promise.all([
        habitsApi.list(),
        completionsApi.getForDate(selectedDateStr),
      ])
      const habitsData: Habit[] = habitsRes.data
      const activeHabits = habitsData.filter(h => h.is_active !== false)
      setHabits(activeHabits)
      const activeHabitIds = new Set(activeHabits.map(h => h.id))
      const validCompleted = completionsRes.data.completed_habit_ids.filter((id: string) => activeHabitIds.has(id))
      setCompleted(new Set(validCompleted))

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
  }, [selectedDateStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  const { notification } = useNotifications()

  const toggleHabit = async (habitId: string, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        await completionsApi.markIncomplete(selectedDateStr, habitId)
        setCompleted((prev) => {
          const next = new Set(prev)
          next.delete(habitId)
          return next
        })
      } else {
        await completionsApi.markComplete(selectedDateStr, habitId)
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
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-400/80 mb-1">
            {isToday ? "Today" : "Historical View"}
          </p>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">{displayDate}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 mt-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <button 
            onClick={() => setSelectedDate(prev => subDays(prev, 1))}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-zinc-400 hover:text-white"
            title="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="relative group p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer" title="Pick date">
            <CalendarDays className="w-5 h-5 text-zinc-400 group-hover:text-brand-300 transition-colors" />
            <input 
              type="date" 
              value={selectedDateStr}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(new Date(e.target.value + "T00:00:00"))
                }
              }}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
            />
          </div>

          <button 
            onClick={() => { if (!isToday) setSelectedDate(prev => addDays(prev, 1)) }}
            disabled={isToday}
            className={cn("p-2 rounded-lg transition-colors text-zinc-400", isToday ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 hover:text-white")}
            title="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="glass-hover rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold tracking-wider uppercase mb-3 relative z-10">
            <CheckCircle2 className="w-4 h-4 text-brand-400" />
            Completed
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-black text-foreground">
              {completed.size}<span className="text-muted-foreground text-xl font-bold ml-1">/ {habits.length}</span>
            </p>
            <div className="mt-4 h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${completionRate}%` }}
              >
              </div>
            </div>
          </div>
        </div>

        <div className="glass-hover rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold tracking-wider uppercase mb-3 relative z-10">
            <Flame className="w-4 h-4 text-brand-300" />
            Best Streak
          </div>
          <p className="text-3xl font-black text-foreground relative z-10">
            {Math.max(0, ...Object.values(streaks).map((s) => s.current_streak))}
            <span className="text-base text-brand-300 font-bold ml-1.5">days</span>
          </p>
        </div>

        <div className="glass-hover rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold tracking-wider uppercase mb-3 relative z-10">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            All-Time Longest
          </div>
          <p className="text-3xl font-black text-foreground relative z-10">
            {Math.max(0, ...Object.values(streaks).map((s) => s.longest_streak))}
            <span className="text-base text-brand-400 font-bold ml-1.5">days</span>
          </p>
        </div>
      </div>

      {/* Habits checklist */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-6 bg-brand-400 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
          {isToday ? "Today's Routine" : "Routine on " + format(selectedDate, "MMM d")}
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
                    ? "border-brand-500/30 bg-brand-500/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]" 
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
                    className={cn("w-6 h-6 rounded-full border-2 transition-all duration-300", isCompleted && "border-brand-400 bg-brand-500 text-white shadow-inner")}
                  />
                </div>
                <div
                  className="w-1.5 h-10 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: habit.color, boxShadow: `0 0 10px ${habit.color}50` }}
                />
                <div className="flex-1 min-w-0 py-1">
                  <p className={cn("text-lg font-semibold transition-all duration-300", isCompleted ? "text-muted-foreground line-through" : "text-foreground group-hover:text-brand-200")}>
                    {habit.name}
                  </p>
                  {habit.description && (
                    <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{habit.description}</p>
                  )}
                </div>
                {streak && (
                  <div className="flex items-center gap-2">
                    {streak.current_streak > 0 && (
                      <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 transition-all duration-300",
                        hotStreak ? "bg-brand-500/10 ring-1 ring-brand-500/30 text-brand-400 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]" : "bg-white/5 text-muted-foreground"
                      )}>
                        <Flame className={cn("w-3.5 h-3.5", hotStreak && "animate-pulse")} />
                        <span className="font-bold text-sm tracking-wide">{streak.current_streak}</span>
                      </div>
                    )}
                    {streak.longest_streak > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 transition-all duration-300 bg-brand-400/10 ring-1 ring-brand-400/30 text-brand-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] hover:bg-brand-400/20">
                        <Trophy className="w-3.5 h-3.5" />
                        <span className="font-bold text-sm tracking-wide">{streak.longest_streak}</span>
                      </div>
                    )}
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
          <div className="glass-hover rounded-2xl p-6 flex items-center justify-between cursor-pointer relative overflow-hidden ring-1 ring-white/5 group-hover:ring-brand-500/30 transition-all duration-500 group-focus-visible:ring-brand-500 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <BookOpen className="w-6 h-6 text-brand-300" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground group-hover:text-brand-100 transition-colors">Today's Journal</p>
                <p className="text-sm text-muted-foreground font-medium mt-0.5">Write your daily reflection</p>
              </div>
            </div>
            <div className="relative z-10 bg-white/5 p-3 rounded-full group-hover:bg-brand-500/20 group-hover:text-brand-300 transition-colors shadow-inner">
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-brand-300 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
