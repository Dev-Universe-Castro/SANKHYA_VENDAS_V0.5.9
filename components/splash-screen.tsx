
"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface SplashScreenProps {
  onFinish: () => void
  duration?: number
}

export function SplashScreen({ onFinish, duration = 2000 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onFinish, 500) // Aguarda a animação de fade-out terminar
    }, duration)

    return () => clearTimeout(timer)
  }, [onFinish, duration])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="flex flex-col items-center justify-center gap-6 animate-fade-in">
        <div className="relative w-80 h-32 md:w-[500px] md:h-40 flex items-center justify-center">
          <Image
            src="/sankhya-logo-horizontal.png"
            alt="Sankhya Logo"
            fill
            className="object-contain animate-pulse"
            priority
          />
        </div>
        <div className="flex gap-2 items-center justify-center">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  )
}
