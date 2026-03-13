import { useEffect, useState } from "react"
import { format, subDays, parseISO } from "date-fns"
import { insightsApi } from "@/lib/api"
import { Sparkles, TrendingUp, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js"
import { Line } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

// ── Types ──────────────────────────────────────────────────────────────────────
interface InsightEntry {
  date: string
  sentiment: string
  mood_score: number
  themes: string[]
}

interface InsightsData {
  entries: InsightEntry[]
  top_themes: { theme: string; count: number }[]
  sentiment_counts: Record<string, number>
}

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

  useEffect(() => {
    insightsApi
      .get(14)
      .then((res) => setData(res.data))
      .catch((err) => console.error("Failed to load insights", err))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) return <Skeleton />

  // Build a full 14-day array (some days may be missing)
  const entryMap = new Map(data.entries.map((e) => [e.date, e]))
  const today = new Date()
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(today, 13 - i)
    const dateStr = format(date, "yyyy-MM-dd")
    return { dateStr, date, entry: entryMap.get(dateStr) ?? null }
  })

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartLabels = last14.map((d) => format(d.date, "MMM d"))
  const chartScores = last14.map((d) => d.entry?.mood_score ?? null)

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

  // ── Sentiment bar ──────────────────────────────────────────────────────────
  const totalSentiments = Object.values(data.sentiment_counts).reduce((a, b) => a + b, 0)

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] overflow-hidden relative">
            <div className="absolute inset-0 bg-white/5" />
            <Sparkles className="w-6 h-6 text-brand-300 relative z-10" />
          </div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Insights</h1>
        </div>
        <p className="text-muted-foreground text-sm font-medium tracking-wide ml-[60px]">
          Your emotional landscape — last 14 days
        </p>
      </div>

      {/* ── Mood Calendar ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-6 bg-brand-400 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
          Mood Ring
        </h2>
        <div className="grid grid-cols-7 gap-2">
          {last14.map(({ dateStr, date, entry }) => {
            const score = entry?.mood_score ?? null
            const sentiment = entry?.sentiment ?? null
            const isToday = format(new Date(), "yyyy-MM-dd") === dateStr
            return (
              <div
                key={dateStr}
                className={cn(
                  "aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-[1.05] cursor-default relative overflow-hidden group",
                  isToday && "ring-2 ring-brand-500/60",
                  score === null
                    ? "bg-white/5 border border-white/5"
                    : "border border-white/10"
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
                  className="text-lg font-black relative z-10"
                  style={{ color: score !== null ? moodColor(score) : "rgba(255,255,255,0.2)" }}
                >
                  {format(date, "d")}
                </span>
                {sentiment && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground relative z-10 mt-0.5 leading-none">
                    {sentiment}
                  </span>
                )}
                {/* dot indicator */}
                {score !== null && (
                  <div
                    className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: moodColor(score) }}
                  />
                )}
              </div>
            )
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#639922" }} />
            Good (&gt;0.3)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#EF9F27" }} />
            Neutral
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#E24B4A" }} />
            Low (&lt;-0.3)
          </div>
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

      {/* ── Bottom row: Theme Pills + Sentiment Breakdown ───────────────── */}
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
            <div className="flex flex-wrap gap-2">
              {data.top_themes.map((t, i) => (
                <div
                  key={t.theme}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 hover:scale-105 border border-white/5 shadow-sm"
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sentiment Breakdown */}
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
      </div>
    </div>
  )
}
