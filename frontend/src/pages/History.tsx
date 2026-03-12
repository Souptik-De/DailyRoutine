import { useEffect, useState, useCallback } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, subMonths, addMonths, parseISO } from "date-fns"
import { habitsApi, completionsApi, journalsApi } from "@/lib/api"
import { ChevronLeft, ChevronRight, CheckCircle2, BookOpen, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Habit {
  id: string
  name: string
  color: string
}

interface DayData {
  completedHabitIds: string[]
  journal: string | null
}

export default function History() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [habits, setHabits] = useState<Habit[]>([])
  const [monthData, setMonthData] = useState<Record<string, DayData>>({})
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMonthData = useCallback(async (month: Date) => {
    setLoading(true)
    try {
      const start = format(startOfMonth(month), "yyyy-MM-dd")
      const end = format(endOfMonth(month), "yyyy-MM-dd")

      const [habitsRes, completionsRes, journalsRes] = await Promise.all([
        habitsApi.list(),
        completionsApi.getRange(start, end),
        journalsApi.list(),
      ])

      setHabits(habitsRes.data.map((h: Habit) => ({ id: h.id, name: h.name, color: h.color })))

      const journalsByDate: Record<string, string> = {}
      for (const entry of journalsRes.data) {
        journalsByDate[entry.date] = entry.content
      }

      const data: Record<string, DayData> = {}
      const completions = completionsRes.data as Record<string, string[]>
      for (const [date, ids] of Object.entries(completions)) {
        data[date] = {
          completedHabitIds: ids,
          journal: journalsByDate[date] ?? null,
        }
      }
      setMonthData(data)
    } catch (err) {
      console.error("Failed to load history", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMonthData(currentMonth)
  }, [currentMonth, loadMonthData])

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startDow = startOfMonth(currentMonth).getDay() // 0=Sun

  const getCompletion = (dateStr: string) => {
    const d = monthData[dateStr]
    if (!d || habits.length === 0) return 0
    return d.completedHabitIds.length / habits.length
  }

  const selectedDayData = selectedDay ? monthData[selectedDay] : null

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">History</h1>
        <p className="text-muted-foreground text-sm mt-1">Your journey through the days</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 glass rounded-xl p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-base font-semibold text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="hover:bg-white/10"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for offset */}
              {Array.from({ length: startDow }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd")
                const rate = getCompletion(dateStr)
                const hasJournal = monthData[dateStr]?.journal != null
                const isSelected = selectedDay === dateStr
                const today = isToday(day)

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={cn(
                      "relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/10",
                      !isSameMonth(day, currentMonth) && "opacity-30",
                      today && "ring-1 ring-violet-500/60",
                      isSelected && "bg-violet-500/20 ring-1 ring-violet-500"
                    )}
                    style={{
                      background: rate > 0 && !isSelected
                        ? `rgba(139, 92, 246, ${rate * 0.35})`
                        : undefined,
                    }}
                  >
                    <span className={cn("text-xs", today ? "text-violet-300" : "text-foreground")}>
                      {format(day, "d")}
                    </span>
                    {hasJournal && (
                      <div className="absolute bottom-1 w-1 h-1 rounded-full bg-pink-400" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm bg-violet-500/35" />
              Habits done
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
              Journal entry
            </div>
          </div>
        </div>

        {/* Day detail panel */}
        <div className="glass rounded-xl p-5 flex flex-col gap-4">
          {selectedDay ? (
            <>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">
                  {format(parseISO(selectedDay), "EEEE")}
                </p>
                <h3 className="text-xl font-bold text-foreground">
                  {format(parseISO(selectedDay), "MMMM d, yyyy")}
                </h3>
              </div>

              {/* Habits */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">HABITS</p>
                {habits.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No habits tracked</p>
                ) : (
                  <div className="space-y-2">
                    {habits.map((habit) => {
                      const done = selectedDayData?.completedHabitIds.includes(habit.id) ?? false
                      return (
                        <div key={habit.id} className="flex items-center gap-2">
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-white/20 flex-shrink-0" />
                          )}
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: habit.color }} />
                          <span className={cn("text-sm", done ? "text-foreground" : "text-muted-foreground")}>
                            {habit.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Journal */}
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-pink-400" />
                  <p className="text-xs font-medium text-muted-foreground">JOURNAL</p>
                </div>
                {selectedDayData?.journal ? (
                  <p className="text-sm text-foreground/80 leading-relaxed line-clamp-[10]">
                    {selectedDayData.journal}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No journal entry for this day</p>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-8">
              <div className="w-12 h-12 rounded-xl glass flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Select a day</p>
                <p className="text-xs text-muted-foreground mt-1">Click any day to see that day's habits and journal entry</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
