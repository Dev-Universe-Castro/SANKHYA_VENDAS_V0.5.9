"use client"

import { useState } from "react"
import LoginForm from "@/components/login-form"
import { SplashScreen } from "@/components/splash-screen"

export default function LoginPage() {
  const [showSplash, setShowSplash] = useState(true)

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} duration={2000} />
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4 animate-fade-in">
      <LoginForm />
    </div>
  )
}
