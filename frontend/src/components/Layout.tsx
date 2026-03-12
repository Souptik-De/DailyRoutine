import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Dumbbell, BookOpen, CalendarDays, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/habits", label: "Habits", icon: Dumbbell },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/history", label: "History", icon: CalendarDays },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 glass border-r border-white/5 flex flex-col py-6 px-4 fixed h-full z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-none">DailyRoutine</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">Your daily companion</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = location.pathname === href
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-violet-500/20 to-indigo-500/10 text-violet-300 border border-violet-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-violet-400" : "text-muted-foreground"
                  )}
                />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Demo badge */}
        <div className="mt-auto px-2">
          <div className="glass rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Logged in as</p>
            <p className="text-sm font-medium text-foreground mt-0.5">Demo User</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
