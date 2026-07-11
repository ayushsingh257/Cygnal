"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(true)

  // Initialize theme from document class to prevent hydration warnings
  useEffect(() => {
    const isDarkTheme = document.documentElement.classList.contains("dark")
    setIsDark(isDarkTheme)
  }, [])

  const toggleTheme = () => {
    const nextDark = !isDark
    setIsDark(nextDark)
    if (nextDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  return (
    <div
      className={cn(
        "flex w-16 h-8 p-1 rounded-full cursor-pointer transition-all duration-300 select-none relative",
        isDark 
          ? "bg-zinc-950 border border-zinc-800" 
          : "bg-zinc-100 border border-zinc-200",
        className
      )}
      onClick={toggleTheme}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          toggleTheme()
        }
      }}
    >
      <div className="flex justify-between items-center w-full relative h-full">
        {/* Sliding Indicator Circle */}
        <div
          className={cn(
            "flex justify-center items-center w-6 h-6 rounded-full transition-transform duration-300 absolute left-0 top-0 z-10",
            isDark 
              ? "transform translate-x-0 bg-zinc-800" 
              : "transform translate-x-8 bg-white shadow-md border border-zinc-200"
          )}
        >
          {isDark ? (
            <Moon 
              className="w-3.5 h-3.5 text-orange-400 fill-orange-400" 
              strokeWidth={1.5}
            />
          ) : (
            <Sun 
              className="w-3.5 h-3.5 text-orange-500 fill-orange-500" 
              strokeWidth={1.5}
            />
          )}
        </div>
        {/* Background Icons */}
        <div className="flex justify-between items-center w-full px-1.5 pointer-events-none">
          <Moon 
            className={cn("w-3.5 h-3.5 transition-opacity duration-300", isDark ? "opacity-0" : "text-zinc-450")} 
            strokeWidth={1.5} 
          />
          <Sun 
            className={cn("w-3.5 h-3.5 transition-opacity duration-300", isDark ? "text-zinc-600" : "opacity-0")} 
            strokeWidth={1.5} 
          />
        </div>
      </div>
    </div>
  )
}
