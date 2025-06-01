'use client'

import React, { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { DebugPanel } from '@/components/DebugPanel'
import { useAppStore } from '@/lib/store'

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [debugMode, setDebugMode] = useState(false)
  const { initializeSession } = useAppStore()

  // Initialize user session on mount
  useEffect(() => {
    initializeSession()
  }, [initializeSession])

  const handleDebugToggle = () => {
    setDebugMode(!debugMode)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <Header debugMode={debugMode} onDebugToggle={handleDebugToggle} />
      
      <main className="relative">
        {children}
      </main>
      
      {debugMode && <DebugPanel />}
    </div>
  )
} 