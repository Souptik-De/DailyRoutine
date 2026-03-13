import { useEffect, useState } from "react"
import { format, subDays } from "date-fns"
import { insightsApi } from "@/lib/api"
import { Sparkles, TrendingUp, Hash, Calendar, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  Tooltip,
  Filler,
} from "chart.js"
import { Line, Radar } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, RadialLinearScale, Tooltip, Filler)

// ── Types ──────────────────────────────────────────────────────────────────────
interface InsightEntry {
  date: string
  sentiment: string
  mood_score: number
  themes: string[]
  content: string
}

interface InsightsData {
  entries: InsightEntry[]
  top_themes: { theme: string; count: number }[]
  theme_dates: Record<string, string[]>
  sentiment_counts: Record<string, number>
}

// ── Time filter options ────────────────────────────────────────────────────────
const TIME_FILTERS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
]

// ── Colour helpers ─────────────────────────────────────────────────────────────
function moodColor(score: number) {
  if (score > 0.3) return "#639922"
  if (score < -0.3) return "#E24B4A"
  return "#EF9F27"
}

function moodBg(score: number) {
  if (score > 0.3) return "rgba(99, 153, 34, 0.15)"
  if (score < -0.3) return "rgba(226, 75, 74, 0.15)"
  return "rgba(239, 159, 39, 0.15)"
}

const SENTIMENT_COLORS: Record<string, string> = {
  Joyful: "#639922",
  Content: "#84B179",
  Neutral: "#EF9F27",
  Anxious: "#E8903C",
  Sad: "#E24B4A",
  Lethargic: "#B07BAC",
  Overwhelmed: "#D45D79",
}

const THEME_COLORS = ["#84B179", "#A2CB8B", "#C7EABB", "#639922", "#EF9F27"]

const SENTIMENT_EMOJIS: Record<string, string> = {
  Joyful: "😄",
  Content: "😊",
  Neutral: "😐",
  Anxious: "😰",
  Sad: "😢",
  Lethargic: "😴",
  Overwhelmed: "🤯",
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-fade-in-up space-y-8">
      <div>
        <div className="h-10 w-48 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-4 w-72 bg-white/5 rounded-lg mt-3 animate-pulse" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
      <div className="flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Insights() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState("14")
  const [selectedDay, setSelectedDay] = useState<InsightEntry | null>(null)
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    insightsApi
      .get(Number(days))
      .then((res) => setData(res.data))
      .catch((err) => console.error("Failed to load insights", err))
      .finally(() => setLoading(false))
  }, [days])

  if (loading || !data) return <Skeleton />

  // Build a full N-day array (some days may be missing)
  const numDays = Number(days)
  const entryMap = new Map(data.entries.map((e) => [e.date, e]))
  const today = new Date()
  const dayArray = Array.from({ length: numDays }, (_, i) => {
    const date = subDays(today, numDays - 1 - i)
    const dateStr = format(date, "yyyy-MM-dd")
    return { dateStr, date, entry: entryMap.get(dateStr) ?? null }
  })

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartLabels = dayArray.map((d) => format(d.date, "MMM d"))
  const chartScores = dayArray.map((d) => d.entry?.mood_score ?? null)

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        data: chartScores,
        borderColor: "#84B179",
        backgroundColor: "rgba(132, 177, 121, 0.1)",
        borderWidth: 2.5,
        pointBackgroundColor: chartScores.map((s) =>
          s !== null ? moodColor(s) : "transparent"
        ),
        pointBorderColor: "transparent",
        pointRadius: chartScores.map((s) => (s !== null ? 5 : 0)),
        pointHoverRadius: 7,
        tension: 0.35,
        fill: true,
        spanGaps: true,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(20, 30, 20, 0.9)",
        titleColor: "#C7EABB",
        bodyColor: "#e0e0e0",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        callbacks: {
          label: (ctx: { raw: number | null }) => {
            const v = ctx.raw
            if (v === null) return "No data"
            return `Mood: ${v > 0 ? "+" : ""}${(v as number).toFixed(2)}`
          },
        },
      },
    },
    scales: {
      y: {
        min: -1,
        max: 1,
        grid: { color: "rgba(255, 255, 255, 0.04)" },
        ticks: {
          color: "rgba(255, 255, 255, 0.3)",
          font: { size: 11, weight: "bold" as const },
          callback: (v: string | number) => {
            const n = Number(v)
            if (n === 1) return "😊"
            if (n === 0) return "😐"
            if (n === -1) return "😢"
            return ""
          },
        },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: "rgba(255, 255, 255, 0.35)",
          font: { size: 10, weight: "bold" as const },
          maxRotation: 0,
        },
        border: { display: false },
      },
    },
  }

  // ── Radar chart data for Sentiment Breakdown ───────────────────────────────
  const sentimentLabels = Object.keys(data.sentiment_counts)
  const sentimentValues = Object.values(data.sentiment_counts)

  const radarData = {
    labels: sentimentLabels,
    datasets: [
      {
        label: "Occurrences",
        data: sentimentValues,
        backgroundColor: "rgba(132, 177, 121, 0.2)",
        borderColor: "#84B179",
        borderWidth: 2,
        pointBackgroundColor: sentimentLabels.map(
          (s) => SENTIMENT_COLORS[s] ?? "#84B179"
        ),
        pointBorderColor: "transparent",
        pointRadius: 5,
        pointHoverRadius: 8,
      },
    ],
  }

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(20, 30, 20, 0.9)",
        titleColor: "#C7EABB",
        bodyColor: "#e0e0e0",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.06)" },
        angleLines: { color: "rgba(255, 255, 255, 0.06)" },
        pointLabels: {
          color: "rgba(255, 255, 255, 0.7)",
          font: { size: 11, weight: "bold" as const },
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.3)",
          backdropColor: "transparent",
          font: { size: 9 },
          stepSize: 1,
        },
      },
    },
  }

  // ── Sentiment bar ──────────────────────────────────────────────────────────
  const totalSentiments = Object.values(data.sentiment_counts).reduce((a, b) => a + b, 0)

  // ── Helper: open modal for a date ──────────────────────────────────────────
  const openDayModal = (dateStr: string) => {
    const entry = entryMap.get(dateStr)
    if (entry) setSelectedDay(entry)
  }

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Header + Filter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] overflow-hidden relative">
              <div className="absolute inset-0 bg-white/5" />
              <Sparkles className="w-6 h-6 text-brand-300 relative z-10" />
            </div>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Insights</h1>
          </div>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[160px] glass border-white/10 text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass border-white/10">
              {TIME_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-sm font-medium">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-muted-foreground text-sm font-medium tracking-wide ml-[60px]">
          Your emotional landscape — last {days} days
        </p>
      </div>

      {/* ── Mood Calendar ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-6 bg-brand-400 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
          Mood Ring
        </h2>
        <div className="grid grid-cols-7 gap-2">
          {dayArray.map(({ dateStr, date, entry }) => {
            const score = entry?.mood_score ?? null
            const sentiment = entry?.sentiment ?? null
            const isToday = format(new Date(), "yyyy-MM-dd") === dateStr
            return (
              <div
                key={dateStr}
                onClick={() => entry && openDayModal(dateStr)}
                className={cn(
                  "aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-[1.05] relative overflow-hidden group",
                  isToday && "ring-2 ring-brand-500/60",
                  score === null
                    ? "bg-white/5 border border-white/5 cursor-default"
                    : "border border-white/10 cursor-pointer"
                )}
                style={{
                  background: score !== null ? moodBg(score) : undefined,
                }}
              >
                {/* glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                  style={{
                    background: score !== null
                      ? `radial-gradient(circle, ${moodColor(score)}22 0%, transparent 70%)`
                      : undefined,
                  }}
                />
                <span
                  className="text-sm font-bold relative z-10 leading-none"
                  style={{ color: score !== null ? moodColor(score) : "rgba(255,255,255,0.25)" }}
                >
                  {format(date, "d")}
                </span>
                {sentiment ? (
                  <span className="text-xl relative z-10 mt-1 leading-none drop-shadow-sm">
                    {SENTIMENT_EMOJIS[sentiment] ?? "😐"}
                  </span>
                ) : (
                  <span className="text-lg relative z-10 mt-1 leading-none opacity-15">
                    —
                  </span>
                )}
              </div>
            )
          })}
        </div>
        {/* Emoji Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground font-medium">
          {Object.entries(SENTIMENT_EMOJIS).map(([label, emoji]) => (
            <div key={label} className="flex items-center gap-1">
              <span className="text-sm">{emoji}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mood Trend Chart ────────────────────────────────────────────────── */}
      <div className="glass rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.25)] relative overflow-hidden">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-300" />
          Mood Trend
        </h2>
        <div className="h-56">
          <Line data={chartData} options={chartOptions as any} />
        </div>
      </div>

      {/* ── Bottom row: Theme Pills + Sentiment Radar ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Pills */}
        <div className="glass rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.25)]">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4 text-brand-300" />
            Top Themes
          </h2>
          {data.top_themes.length === 0 ? (
            <p className="text-sm text-muted-foreground/70 italic">No themes yet — write more entries!</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {data.top_themes.map((t, i) => (
                  <button
                    key={t.theme}
                    onClick={() =>
                      setExpandedTheme(expandedTheme === t.theme ? null : t.theme)
                    }
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 hover:scale-105 border shadow-sm cursor-pointer",
                      expandedTheme === t.theme
                        ? "border-white/20 ring-1 ring-white/10"
                        : "border-white/5"
                    )}
                    style={{
                      backgroundColor: `${THEME_COLORS[i % THEME_COLORS.length]}18`,
                      color: THEME_COLORS[i % THEME_COLORS.length],
                    }}
                  >
                    <span>{t.theme}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-black"
                      style={{ backgroundColor: `${THEME_COLORS[i % THEME_COLORS.length]}25` }}
                    >
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Expanded theme dates */}
              {expandedTheme && data.theme_dates[expandedTheme] && (
                <div className="mt-3 p-3 rounded-2xl bg-white/5 border border-white/5 animate-fade-in-up">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      Days with "{expandedTheme}"
                    </span>
                    <button
                      onClick={() => setExpandedTheme(null)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.theme_dates[expandedTheme].map((d) => (
                      <button
                        key={d}
                        onClick={() => openDayModal(d)}
                        className="px-3 py-1 rounded-full bg-brand-500/15 text-brand-300 text-xs font-bold border border-brand-500/20 hover:bg-brand-500/25 transition-all cursor-pointer"
                      >
                        {format(new Date(d + "T00:00:00"), "MMM d")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sentiment Radar Chart */}
        <div className="glass rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.25)]">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-300" />
            Sentiment Radar
          </h2>
          {sentimentLabels.length === 0 ? (
            <p className="text-sm text-muted-foreground/70 italic">No data yet</p>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <Radar data={radarData} options={radarOptions as any} />
            </div>
          )}
        </div>
      </div>

      {/* ── Sentiment Breakdown Bars ────────────────────────────────────────── */}
      <div className="glass rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.25)]">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-300" />
          Sentiment Breakdown
        </h2>
        {totalSentiments === 0 ? (
          <p className="text-sm text-muted-foreground/70 italic">No data yet</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(data.sentiment_counts)
              .sort((a, b) => b[1] - a[1])
              .map(([sentiment, count]) => {
                const pct = Math.round((count / totalSentiments) * 100)
                const color = SENTIMENT_COLORS[sentiment] ?? "#888"
                return (
                  <div key={sentiment}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-foreground">{sentiment}</span>
                      <span className="text-xs text-muted-foreground font-bold">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* ── Day Detail Modal ─────────────────────────────────────────────── */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-md">
          {selectedDay && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-300" />
                  {format(new Date(selectedDay.date + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Mood & Sentiment */}
                <div className="flex items-center gap-3">
                  <div
                    className="px-3 py-1.5 rounded-full text-sm font-bold border"
                    style={{
                      backgroundColor: moodBg(selectedDay.mood_score),
                      color: moodColor(selectedDay.mood_score),
                      borderColor: `${moodColor(selectedDay.mood_score)}30`,
                    }}
                  >
                    {selectedDay.sentiment}
                  </div>
                  <span
                    className="text-sm font-bold"
                    style={{ color: moodColor(selectedDay.mood_score) }}
                  >
                    Mood: {selectedDay.mood_score > 0 ? "+" : ""}
                    {selectedDay.mood_score.toFixed(2)}
                  </span>
                </div>

                {/* Themes */}
                {selectedDay.themes.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                      Themes
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDay.themes.map((theme, i) => (
                        <span
                          key={theme}
                          className="px-3 py-1 rounded-full text-xs font-bold border border-white/5"
                          style={{
                            backgroundColor: `${THEME_COLORS[i % THEME_COLORS.length]}18`,
                            color: THEME_COLORS[i % THEME_COLORS.length],
                          }}
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Journal Content */}
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                    Journal Entry
                  </span>
                  {selectedDay.content ? (
                    <div className="text-sm text-foreground/90 leading-relaxed bg-white/5 rounded-2xl p-4 border border-white/5 max-h-60 overflow-y-auto whitespace-pre-wrap">
                      {selectedDay.content}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/70 italic">
                      No journal entry for this day.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
