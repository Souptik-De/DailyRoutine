import { useState, useRef, useEffect } from "react"
import { UploadCloud, CheckCircle2, AlertTriangle, AlertCircle, X, Loader2 } from "lucide-react"
import { uploadProofImage, ProofUploadError } from "@/lib/uploadProof"
import { checkinApi } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Habit {
  id: string
  name: string
  requires_proof?: boolean
  proof_hint?: string
  color: string
}

interface HabitCheckInProps {
  habit: Habit
  userId: string
  onStreakUpdate: (newStreak: number) => void
  onClose: () => void
  onLegacyCheckin: () => void
}

type UIStatus = 
  | "idle"
  | "uploading"
  | "analysing"
  | "approved"
  | "rejected"
  | "fraud_detected"
  | "unclear"
  | "rate_limited"
  | "error"

export default function HabitCheckIn({ habit, userId, onStreakUpdate, onClose, onLegacyCheckin }: HabitCheckInProps) {
  const [status, setStatus] = useState<UIStatus>("idle")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Verification results
  const [streakCount, setStreakCount] = useState<number>(0)
  const [verdict, setVerdict] = useState<string>("")
  const [sarcasticComment, setSarcasticComment] = useState<string>("")
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(3)
  const [message, setMessage] = useState<string>("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Rotating texts during analysis
  const ALL_ANALYSIS_TEXTS = [
    "Checking for donuts disguised as salads...",
    "Running this through the lie detector...",
    "Cross-referencing with your excuses...",
    "The AI is judging you right now...",
  ]
  const [analysisTextIdx, setAnalysisTextIdx] = useState(0)

  useEffect(() => {
    if (status === "analysing") {
      const interval = setInterval(() => {
        setAnalysisTextIdx((prev) => (prev + 1) % ALL_ANALYSIS_TEXTS.length)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [status])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // If not requiring proof, immediately trigger legacy checkin and exit
  useEffect(() => {
    if (habit.requires_proof === false && status === "idle") {
      onLegacyCheckin()
      onClose()
    }
  }, [habit.requires_proof, status, onLegacyCheckin, onClose])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(file))
      setErrorMsg(null)
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) return

    try {
      setStatus("uploading")
      setErrorMsg(null)

      // Phase 1: Upload to Cloudinary
      const uploadResult = await uploadProofImage(selectedFile, habit.id, userId)

      // Phase 2: Transmit to backend
      setStatus("analysing")
      const res = await checkinApi.submitProof(userId, habit.id, uploadResult.imageUrl)
      const data = res.data

      setStatus(data.status as UIStatus) // 'approved', 'rejected', 'fraud_detected', 'unclear', 'rate_limited'
      
      if (data.status === "approved") {
        setStreakCount(data.streakCount || 0)
        setVerdict(data.verdict || "")
        setMessage(data.message || "")
        // Auto close after 2.5s on success
        setTimeout(() => {
          onStreakUpdate(data.streakCount || 0)
          onClose()
        }, 2500)
      } else if (data.status === "rejected" || data.status === "fraud_detected") {
        setSarcasticComment(data.sarcasticComment || "")
        setVerdict(data.verdict || "")
        setAttemptsRemaining(data.attemptsRemaining || 0)
      } else if (data.status === "unclear" || data.status === "rate_limited") {
        setMessage(data.message || "")
      }

    } catch (err: any) {
      if (err instanceof ProofUploadError) {
        setStatus("error")
        setErrorMsg(err.message)
      } else if (err.response?.status === 429) {
        setStatus("rate_limited")
        setMessage(err.response.data.detail || "Rate limited. Try again later.")
      } else {
        setStatus("error")
        setErrorMsg("Upload or verification failed. Check your connection and try again.")
      }
    }
  }

  const handleTryAgain = () => {
    setStatus("idle")
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setErrorMsg(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ── Render Helpers ──────────────────────────────────────────────────────────

  const Dots = ({ total, remaining }: { total: number, remaining: number }) => (
    <div className="flex justify-center gap-1.5 mt-4">
      {Array.from({ length: total }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            "w-2.5 h-2.5 rounded-full",
            i < remaining ? "bg-white/40" : "bg-white/10"
          )}
        />
      ))}
    </div>
  )

  const renderContent = () => {
    switch (status) {
      case "idle":
      case "error":
        return (
          <div className="flex flex-col items-center animate-fade-in-up">
            <h2 className="text-3xl font-black text-white text-center mb-2">{habit.name}</h2>
            {habit.proof_hint && (
              <p className="text-white/60 text-sm font-medium mb-8 text-center px-4">
                Proof needed: {habit.proof_hint}
              </p>
            )}

            <input 
              type="file" 
              accept="image/jpeg, image/png, image/webp" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileSelect}
            />

            {!previewUrl ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-sm aspect-square border-2 border-dashed border-white/20 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-white/50 hover:bg-white/5 transition-all duration-300 group"
              >
                <UploadCloud className="w-12 h-12 text-white/40 group-hover:text-white/80 transition-colors mb-4" />
                <p className="text-white/80 font-bold mb-1">Tap to upload proof</p>
                <p className="text-white/40 text-xs">JPEG, PNG or WEBP · Max 4MB</p>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-sm aspect-square rounded-3xl overflow-hidden cursor-pointer relative group"
              >
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white font-bold tracking-wide">Change Image</p>
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="text-red-400 font-medium text-sm mt-6 text-center">{errorMsg}</p>
            )}

            <div className="flex flex-col gap-3 w-full max-w-sm mt-8">
              <button
                disabled={!selectedFile}
                onClick={handleSubmit}
                className={cn(
                  "w-full py-4 rounded-xl font-bold tracking-wide transition-all shadow-lg",
                  selectedFile 
                    ? "bg-white text-black hover:bg-white/90 hover:-translate-y-0.5" 
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
              >
                Submit Proof
              </button>
              <button onClick={onClose} className="w-full py-3 text-white/50 hover:text-white text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )

      case "uploading":
      case "analysing":
        return (
          <div className="flex flex-col items-center justify-center animate-fade-in-up h-full">
            <div className="relative w-64 h-64 rounded-3xl overflow-hidden mb-8 shadow-2xl ring-1 ring-white/10">
              {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-50 blur-sm" />}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                <p className="text-white font-bold tracking-widest uppercase text-sm">
                  {status === "uploading" ? "Uploading your proof..." : "Analysing your proof..."}
                </p>
              </div>
            </div>
            {status === "analysing" && (
              <p className="text-white/60 font-medium text-center h-6 transition-opacity duration-300">
                {ALL_ANALYSIS_TEXTS[analysisTextIdx]}
              </p>
            )}
          </div>
        )

      case "approved":
        return (
          <div className="flex flex-col items-center justify-center px-6 text-center animate-fade-in-up h-full">
            <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight mb-2">
              {streakCount} day streak
            </h2>
            <p className="text-white/60 font-medium mb-8">
              {message}
            </p>
            {verdict && <p className="text-green-400/80 text-sm font-medium max-w-sm italic">"{verdict}"</p>}
          </div>
        )

      case "rejected":
      case "fraud_detected":
        const isFraud = status === "fraud_detected"
        return (
          <div className="flex flex-col items-center justify-center px-6 max-w-lg mx-auto animate-fade-in-up h-full">
            <div className="w-full text-center">
              <span className={cn(
                "text-2xl md:text-3xl font-bold tracking-tight leading-tight italic block mb-6",
                isFraud ? "text-amber-500" : "text-white"
              )}>
                — {sarcasticComment}
              </span>
              <p className="text-white/40 text-sm font-medium mb-6">
                {verdict}
              </p>
              
              <Dots total={3} remaining={attemptsRemaining} />
              <p className="text-white/30 text-xs mt-2 font-bold uppercase tracking-widest">Attempts Left</p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-sm mt-12">
              <button
                onClick={handleTryAgain}
                className="w-full py-4 rounded-xl bg-white/10 text-white font-bold tracking-wide hover:bg-white/20 transition-all hover:-translate-y-0.5 shadow-lg"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 text-white/40 hover:text-white text-sm font-medium transition-colors"
              >
                Give Up Today
              </button>
            </div>
          </div>
        )

      case "unclear":
        return (
          <div className="flex flex-col items-center justify-center px-6 text-center animate-fade-in-up h-full">
            <div className="w-20 h-20 bg-white/5 text-white/60 rounded-full flex items-center justify-center mb-8">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-white mb-3">Couldn't read your image clearly.</h2>
            <p className="text-white/60 font-medium max-w-xs mb-10">
              {message || "Try better lighting or move closer."}
            </p>
            
            <div className="w-full max-w-sm flex flex-col gap-2">
              <button
                onClick={handleTryAgain}
                className="w-full py-4 rounded-xl bg-white text-black font-bold tracking-wide hover:bg-white/90 transition-all shadow-lg"
              >
                Try Again
              </button>
              <p className="text-white/40 text-xs font-semibold">This won't count against your attempts.</p>
              <button
                onClick={onClose}
                className="w-full py-3 text-white/40 hover:text-white text-sm font-medium mt-2 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )

      case "rate_limited":
        return (
          <div className="flex flex-col items-center justify-center px-6 text-center animate-fade-in-up h-full">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-white mb-3">Three attempts used. Come back tomorrow.</h2>
            <button
              onClick={onClose}
              className="w-full max-w-sm mt-10 py-4 rounded-xl bg-white/10 text-white font-bold tracking-wide hover:bg-white/20 transition-all shadow-lg"
            >
              Close
            </button>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />
      
      {/* Close button in top right if not uploading/analysing or approved */}
      {status !== "uploading" && status !== "analysing" && status !== "approved" && (
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all z-10"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      {/* Main Container */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-6">
        {renderContent()}
      </div>
    </div>
  )
}
