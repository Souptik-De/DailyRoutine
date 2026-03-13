import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Dumbbell, BookOpen, CalendarDays, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/habits", label: "Habits", icon: Dumbbell },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/history", label: "History", icon: CalendarDays },
  { href: "/insights", label: "Insights", icon: Sparkles },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="flex min-h-screen noise-bg">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 overflow-hidden glass border-r border-white/5 flex flex-col py-6 px-4 fixed h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        {/* Animated background blobs for sidebar only */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
          <div className="absolute -top-[10%] -left-[10%] w-[120%] h-[120%] bg-[radial-gradient(circle,rgba(132,177,121,0.25)_0%,transparent_70%)] rounded-full blur-[50px] animate-blob"></div>
          <div className="absolute -bottom-[10%] -right-[10%] w-[120%] h-[120%] bg-[radial-gradient(circle,rgba(162,203,139,0.2)_0%,transparent_70%)] rounded-full blur-[50px] animate-blob" style={{ animationDelay: '2s', animationDirection: 'alternate-reverse' }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mb-10">
          <div className="flex items-center justify-center">
            <img src="/logoooo.svg" alt="DailyRoutine Logo" className="w-8 h-8" />
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden group",
                  isActive
                    ? "text-white bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] ring-1 ring-white/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-500/30 to-transparent opacity-80 mix-blend-overlay" />
                )}
                <Icon
                  className={cn(
                    "w-4 h-4 transition-all duration-300 relative z-10",
                    isActive ? "text-brand-300 drop-shadow-[0_0_8px_rgba(132,177,121,0.8)] scale-110" : "text-muted-foreground group-hover:scale-110"
                  )}
                />
                <span className="relative z-10">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Demo badge */}
        <div className="mt-auto px-2 relative z-10">
          <div className="glass rounded-xl p-4 text-center border-t border-white/10 bg-gradient-to-b from-white/5 to-transparent">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1.5 hidden lg:block">Account</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm font-bold text-foreground">Demo User</p>
            </div>
          </div>
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
