"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { LiquidCard, CardContent, CardHeader } from "@/components/ui/liquid-glass-card"
import { Badge } from "@/components/ui/badge"
import { LiquidButton } from "@/components/ui/liquid-glass-button"

// Types and Enums
enum Strength {
  None = "none",
  Weak = "weak",
  Moderate = "moderate",
  Strong = "strong",
}

interface FinancialScoreProps {
  title: string
  description: string
  initialScore?: number
}

interface FinancialScoreButtonProps {
  children?: React.ReactNode
  isOutlined?: boolean
  onClick?: () => void
}

interface FinancialScoreCardProps {
  children?: React.ReactNode
}

interface FinancialScoreDisplayProps {
  value: Score
  max: number
}

interface FinancialScoreHalfCircleProps {
  value: Score
  max: number
}

interface FinancialScoreHeaderProps {
  title?: string
  strength?: Strength
}

type CounterContextType = {
  getNextIndex: () => number
}

type Score = number | null
type StrengthColors = Record<Strength, string[]>

// Sample Data tailored for Cygnal Security Posture
const data: FinancialScoreProps[] = [
  {
    title: "Threat Protection Score",
    description:
      "Measures your overall indicator scan coverage across the 8 parallel threat providers. Higher score means fewer blind spots.",
    initialScore: 88,
  },
  {
    title: "SSO Identity Compliance",
    description:
      "Validates directory mapping, session rotation, and JWT revocation coverage. High score implies robust Zero-Trust posture.",
    initialScore: 92,
  },
  {
    title: "Forensic Chain of Custody",
    description:
      "Measures verified SHA-256 file custody integrity. Real-time audit trails and signed ledgers prevent unauthorized changes.",
    initialScore: 100,
  },
]

// Utils Class
class Utils {
  static LOCALE = "en-US"

  static easings = {
    easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
    easeOut: "cubic-bezier(0.33, 1, 0.68, 1)",
  }

  static circumference(r: number): number {
    return 2 * Math.PI * r
  }

  static formatNumber(n: number) {
    return new Intl.NumberFormat(this.LOCALE).format(n)
  }

  static getStrength(score: Score, maxScore: number): Strength {
    if (!score) return Strength.None

    const percent = score / maxScore

    if (percent >= 0.8) return Strength.Strong
    if (percent >= 0.4) return Strength.Moderate

    return Strength.Weak
  }

  static randomHash(length = 4): string {
    const chars = "abcdef0123456789"
    const bytes = crypto.getRandomValues(new Uint8Array(length))

    return [...bytes].map((b) => chars[b % chars.length]).join("")
  }

  static randomInt(min = 0, max = 1): number {
    const value = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32

    return Math.round(min + (max - min) * value)
  }
}

// Context
const CounterContext = createContext<CounterContextType | undefined>(undefined)

const CounterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const counterRef = useRef(0)
  const getNextIndex = useCallback(() => {
    return counterRef.current++
  }, [])

  return <CounterContext.Provider value={{ getNextIndex }}>{children}</CounterContext.Provider>
}

const useCounter = () => {
  const context = useContext(CounterContext)

  if (!context) {
    throw new Error("useCounter must be used within a CounterProvider")
  }

  return context.getNextIndex
}

// Components
function FinancialScoreButton({ children, isOutlined, onClick }: FinancialScoreButtonProps) {
  return (
    <LiquidButton
      variant={"secondary"}
      onClick={onClick}
      className="w-full h-12 text-xs py-2 hover:scale-[1.02] border border-[#ea580c]/30 text-[#ea580c] dark:text-[#ea580c] bg-[#ea580c]/5 hover:bg-[#ea580c]/15 transition-all duration-300 font-mono tracking-wider"
    >
      {children}
    </LiquidButton>
  )
}

function FinancialScoreCard({ children }: FinancialScoreCardProps) {
  const getNextIndex = useCounter()
  const indexRef = useRef<number | null>(null)
  const animationRef = useRef<any>(null)
  const [appearing, setAppearing] = useState(false)

  if (indexRef.current === null) {
    indexRef.current = getNextIndex()
  }

  useEffect(() => {
    const delayInc = 200
    const delay = 300 + indexRef.current! * delayInc

    animationRef.current = setTimeout(() => setAppearing(true), delay)

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
    }
  }, [])

  if (!appearing) return null

  return (
    <LiquidCard className="w-full max-w-sm border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] hover:border-[var(--border-blue)] transition-all duration-500 rounded-2xl">
      <CardContent className="p-7">{children}</CardContent>
    </LiquidCard>
  )
}

function FinancialScoreDisplay({ value, max }: FinancialScoreDisplayProps) {
  const hasValue = value !== null
  const digits = String(Math.floor(value!)).split("")
  const maxFormatted = Utils.formatNumber(max)
  const label = hasValue ? `out of ${maxFormatted}` : "No score"

  return (
    <div className="absolute bottom-0 w-full text-center">
      <div className="text-4xl font-bold h-12 overflow-hidden relative font-mono text-[#ea580c] dark:text-[#ea580c]">
        <div className="absolute inset-0 opacity-0">
          <div className="inline-block">0</div>
        </div>
        <div className="absolute inset-0 flex justify-center items-center gap-0.5">
          {hasValue &&
            digits.map((digit, i) => (
              <span
                key={i}
                className="inline-block animate-in slide-in-from-bottom-full duration-800 delay-400 fill-mode-both"
                style={{
                  animationDelay: `${400 + i * 100}ms`,
                  animationDuration: `${800 + i * 300}ms`,
                }}
              >
                {digit}
              </span>
            ))}
        </div>
      </div>
      <div className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest mt-1">{label}</div>
    </div>
  )
}

function FinancialScoreHalfCircle({ value, max }: FinancialScoreHalfCircleProps) {
  const strokeRef = useRef<SVGCircleElement>(null)
  const gradIdRef = useRef(`grad-${Utils.randomHash()}`)
  const gradId = gradIdRef.current
  const gradStroke = `url(#${gradId})`
  const radius = 45
  const dist = Utils.circumference(radius)
  const distHalf = dist / 2
  const distFourth = distHalf / 2
  const strokeDasharray = `${distHalf} ${distHalf}`
  const distForValue = Math.min((value as number) / max, 1) * -distHalf
  const strokeDashoffset = value !== null ? distForValue : -distFourth
  const strength = Utils.getStrength(value, max)
  
  // Custom brand colors: Orange accents
  const strengthColors: StrengthColors = {
    none: ["#71717a", "#52525b"],
    weak: ["#ef4444", "#b91c1c"],
    moderate: ["#f59e0b", "#d97706"],
    strong: ["#f97316", "#ea580c"],
  }
  const colorStops = strengthColors[strength]

  useEffect(() => {
    const strokeStart = 400
    const duration = 1400

    strokeRef.current?.animate(
      [
        { strokeDashoffset: "0", offset: 0 },
        { strokeDashoffset: "0", offset: strokeStart / duration },
        { strokeDashoffset: strokeDashoffset.toString() },
      ],
      {
        duration,
        easing: Utils.easings.easeInOut,
        fill: "forwards",
      },
    )
  }, [value, max, strokeDashoffset])

  return (
    <svg className="block mx-auto w-auto max-w-full h-32" viewBox="0 -6 100 56" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          {colorStops.map((stop, i) => {
            const offset = `${(100 / (colorStops.length - 1)) * i}%`
            return <stop key={i} offset={offset} stopColor={stop} />
          })}
        </linearGradient>
      </defs>
      <g fill="none" strokeWidth="9" transform="translate(50, 48)">
        <circle className="stroke-zinc-200 dark:stroke-zinc-800" r={radius} />
        <circle ref={strokeRef} stroke={gradStroke} strokeDasharray={strokeDasharray} r={radius} />
      </g>
    </svg>
  )
}

function FinancialScoreHeader({ title, strength }: FinancialScoreHeaderProps) {
  const hasStrength = strength && strength !== Strength.None

  const getBadgeClassName = (s: Strength) => {
    switch (s) {
      case Strength.Weak:
        return "bg-red-500/10 text-red-500 border border-red-500/20"
      case Strength.Moderate:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
      case Strength.Strong:
        return "bg-[#ea580c]/10 text-[#ea580c] border border-[#ea580c]/20"
      default:
        return ""
    }
  }

  return (
    <CardHeader className="flex flex-row items-center justify-between gap-4 pb-6 px-0">
      <h2 className="text-xs font-bold tracking-wider font-mono text-[var(--text-primary)] uppercase truncate">{title}</h2>
      {hasStrength && (
        <Badge
          className={`uppercase text-[8px] font-mono tracking-widest px-2 py-0.5 shrink-0 rounded ${getBadgeClassName(strength as Strength)}`}
        >
          {strength}
        </Badge>
      )}
    </CardHeader>
  )
}

function FinancialScore({ title, description, initialScore }: FinancialScoreProps) {
  const router = useRouter()
  const [score, setScore] = useState<Score>(initialScore ?? null)
  const [isAuditing, setIsAuditing] = useState(false)
  const hasScore = score !== null && !isAuditing
  const max = 100
  const strength = Utils.getStrength(score, max)

  function handleAuditClick(): void {
    if (score !== null && !isAuditing) {
      // Re-audit or Learn More link
      router.push("/login")
    } else {
      // Run auditing animation
      setIsAuditing(true)
      let count = 0
      const interval = setInterval(() => {
        setScore(Utils.randomInt(40, 99))
        count++
        if (count >= 12) {
          clearInterval(interval)
          setScore(Utils.randomInt(85, max))
          setIsAuditing(false)
        }
      }, 90)
    }
  }

  return (
    <FinancialScoreCard>
      <FinancialScoreHeader title={title} strength={strength} />
      <div className="relative mb-6">
        <FinancialScoreHalfCircle value={score} max={max} />
        <FinancialScoreDisplay value={score} max={max} />
      </div>
      <p className="text-[var(--text-secondary)] text-xs text-center mb-6 min-h-[3rem] leading-relaxed">
        {description}
      </p>
      <FinancialScoreButton isOutlined={hasScore} onClick={handleAuditClick}>
        {isAuditing ? "Auditing Node..." : hasScore ? "Learn More" : "Audit Score"}
      </FinancialScoreButton>
    </FinancialScoreCard>
  )
}

// Main Component
export function FinancialScoreCards() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 mx-auto py-6 px-6">
      <CounterProvider>
        {data.map((card, i) => (
          <FinancialScore key={i} {...card} />
        ))}
      </CounterProvider>
    </div>
  )
}
