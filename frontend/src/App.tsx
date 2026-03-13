import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Habits from "@/pages/Habits"
import Journal from "@/pages/Journal"
import History from "@/pages/History"
import Insights from "@/pages/Insights"
import AccountabilityModal from "@/components/AccountabilityModal"
import { useNotifications } from "@/hooks/useNotifications.tsx"
import "./index.css"

function AppContent() {
  const { notification, markSeen } = useNotifications()

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/history" element={<History />} />
          <Route path="/insights" element={<Insights />} />
        </Routes>
      </Layout>

      {/* Accountability Coach — full-screen intervention modal */}
      {notification && (
        <AccountabilityModal
          notification={notification}
          onClose={() => markSeen(notification.id)}
        />
      )}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
