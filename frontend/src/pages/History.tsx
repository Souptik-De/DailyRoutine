import { useEffect, useState, useCallback } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, subMonths, addMonths, parseISO, setMonth, setYear } from "date-fns"
import { habitsApi, completionsApi, journalsApi } from "@/lib/api"
import { ChevronLeft, ChevronRight, CheckCircle2, BookOpen, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogTrigger,
  DialogContainer,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogSubtitle,
  DialogDescription,
} from "@/components/ui/linear-modal"
import { cn } from "@/lib/utils"

interface Habit {
  id: string
  name: string
  color: string
}

interface DayData {
  completedHabitIds: string[]
  journal: { content: string, updated_at: string } | null
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

      const journalsByDate: Record<string, { content: string, updated_at: string }> = {}
      for (const entry of journalsRes.data) {
        journalsByDate[entry.date] = { content: entry.content, updated_at: entry.updated_at }
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
    <div className="animate-fade-in-up space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold text-foreground tracking-tight">History</h1>
        <p className="text-muted-foreground text-sm font-medium mt-2">Your journey through the days</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar */}
        <div className="lg:col-span-2 glass rounded-3xl p-8 relative overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.25)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />
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
            
            <div className="flex items-center gap-2">
              <Select value={currentMonth.getMonth().toString()} onValueChange={(v) => setCurrentMonth(setMonth(currentMonth, parseInt(v)))}>
                <SelectTrigger className="w-[130px] bg-white/5 border-white/10 glass cursor-pointer font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-white/10 max-h-[300px]">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i} value={i.toString()} className="cursor-pointer">
                      {format(setMonth(new Date(), i), "MMMM")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={currentMonth.getFullYear().toString()} onValueChange={(v) => setCurrentMonth(setYear(currentMonth, parseInt(v)))}>
                <SelectTrigger className="w-[100px] bg-white/5 border-white/10 glass cursor-pointer font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-white/10 max-h-[300px]">
                  {Array.from({ length: 27 }).map((_, i) => {
                    const year = 2000 + i
                    return (
                      <SelectItem key={year} value={year.toString()} className="cursor-pointer">
                        {year}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

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
                      "relative aspect-square flex flex-col items-center justify-center rounded-2xl text-base font-bold transition-all duration-300 hover:scale-[1.05] hover:bg-white/10 hover:shadow-lg",
                      !isSameMonth(day, currentMonth) && "opacity-30",
                      today && !isSelected && "ring-2 ring-violet-500/80 shadow-[0_0_15px_rgba(139,92,246,0.3)] text-violet-300",
                      isSelected && "bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] scale-110 z-10 border-0 ring-2 ring-white/20"
                    )}
                    style={{
                      background: rate > 0 && !isSelected
                        ? `rgba(139, 92, 246, ${rate * 0.4})`
                        : undefined,
                    }}
                  >
                    <span className={cn("relative z-10", !isSelected && today ? "text-violet-300" : (isSelected ? "text-white" : "text-foreground"))}>
                      {format(day, "d")}
                    </span>
                    {hasJournal && (
                      <div className={cn("absolute bottom-2 w-1.5 h-1.5 rounded-full transition-colors", isSelected ? "bg-white" : "bg-pink-400")} />
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
        <div className="glass rounded-3xl p-8 flex flex-col gap-8 relative overflow-y-auto shadow-[0_8px_40px_rgba(0,0,0,0.25)] animate-fade-in-up md:max-h-[calc(100vh-12rem)] md:sticky md:top-24 flex-shrink-0" style={{ animationDelay: "100ms" }}>
          {selectedDay ? (
            <>
              <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/10 rounded-full blur-[60px] pointer-events-none" />
              <div className="relative z-10 flex-shrink-0">
                <p className="text-xs text-violet-400 uppercase tracking-[0.2em] font-bold mb-2">
                  {format(parseISO(selectedDay), "EEEE")}
                </p>
                <h3 className="text-3xl font-extrabold text-foreground tracking-tight">
                  {format(parseISO(selectedDay), "MMMM d, yyyy")}
                </h3>
              </div>

              {/* Journal */}
              <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Journal</p>
                </div>
                {selectedDayData?.journal ? (
                  <Dialog>
                    <DialogTrigger className="w-full text-left">
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-sm hover:bg-white/10 cursor-pointer transition-colors block">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-base text-foreground/90 leading-relaxed font-medium line-clamp-3">
                            {selectedDayData.journal.content}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right mt-2 opacity-80">
                          Last edited: {(() => {
                            const utcStr = selectedDayData.journal.updated_at;
                            if (!utcStr) return "Unknown";
                            const date = new Date(utcStr + (utcStr.endsWith("Z") ? "" : "Z"));
                            return new Intl.DateTimeFormat('en-US', {
                              timeZone: 'Asia/Kolkata',
                              hour: 'numeric',
                              minute: 'numeric',
                              hour12: true
                            }).format(date) + " IST";
                          })()}
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContainer>
                      <DialogContent className="pointer-events-auto relative flex h-auto w-full max-w-[600px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 shadow-2xl backdrop-blur-2xl">
                        <div className="p-8 max-h-[80vh] overflow-y-auto">
                          <DialogTitle className="text-3xl font-bold text-pink-400 mb-2 flex items-center gap-3">
                            <BookOpen className="w-6 h-6" />
                            Journal Entry
                          </DialogTitle>
                          <DialogSubtitle className="text-muted-foreground mb-8 font-medium flex items-center justify-between">
                            <span>{format(parseISO(selectedDay!), "EEEE, MMMM d, yyyy")}</span>
                            <span className="text-xs opacity-70">
                              Last edited: {(() => {
                                const utcStr = selectedDayData.journal.updated_at;
                                if (!utcStr) return "Unknown";
                                const date = new Date(utcStr + (utcStr.endsWith("Z") ? "" : "Z"));
                                return new Intl.DateTimeFormat('en-US', {
                                  timeZone: 'Asia/Kolkata',
                                  hour: 'numeric',
                                  minute: 'numeric',
                                  hour12: true
                                }).format(date) + " IST";
                              })()}
                            </span>
                          </DialogSubtitle>
                          <DialogDescription className="text-lg text-white/90 leading-relaxed whitespace-pre-wrap bg-white/5 p-6 rounded-2xl border border-white/5">
                            {selectedDayData.journal.content}
                          </DialogDescription>
                        </div>
                        <DialogClose />
                      </DialogContent>
                    </DialogContainer>
                  </Dialog>
                ) : (
                  <p className="text-sm text-muted-foreground/80 italic bg-white/5 p-5 rounded-2xl border border-white/5">No journal entry for this day</p>
                )}
              </div>

              {/* Habits */}
              <div className="relative z-10">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  Habits
                </p>
                {habits.length === 0 ? (
                  <p className="text-sm text-muted-foreground/80 italic">No habits tracked</p>
                ) : (
                  <div className="space-y-3">
                    {habits.map((habit) => {
                      const done = selectedDayData?.completedHabitIds.includes(habit.id) ?? false
                      return (
                        <Dialog key={habit.id}>
                          <DialogTrigger className="w-full">
                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors w-full cursor-pointer">
                              {done ? (
                                <CheckCircle2 className="w-5 h-5 text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)] flex-shrink-0" />
                              ) : (
                                <Circle className="w-5 h-5 text-white/20 flex-shrink-0" />
                              )}
                              <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: habit.color, boxShadow: `0 0 8px ${habit.color}80` }} />
                              <span className={cn("text-base font-semibold", done ? "text-foreground" : "text-muted-foreground")}>
                                {habit.name}
                              </span>
                            </div>
                          </DialogTrigger>
                          <DialogContainer>
                            <DialogContent className="pointer-events-auto relative flex h-auto w-full max-w-[400px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 shadow-2xl backdrop-blur-2xl">
                              <div className="p-8">
                                <DialogTitle className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: habit.color, boxShadow: `0 0 8px ${habit.color}80` }} />
                                  {habit.name}
                                </DialogTitle>
                                <DialogSubtitle className="text-muted-foreground mb-6 font-medium">Habit Details</DialogSubtitle>
                                <DialogDescription className="text-base text-white/90 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                                  {done ? "You completed this habit on this day! Keep up the good work." : "You missed this habit on this day. Don't give up and try again tomorrow!"}
                                </DialogDescription>
                              </div>
                              <DialogClose />
                            </DialogContent>
                          </DialogContainer>
                        </Dialog>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-5 py-12">
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">Select a day</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-[200px] mx-auto">Click any day from the calendar to see details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
