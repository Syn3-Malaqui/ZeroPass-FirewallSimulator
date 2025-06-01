'use client'

import React, { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Dashboard } from '@/components/Dashboard'
import { DebugPanel } from '@/components/DebugPanel'

export default function HomePage() {
  const [debugMode, setDebugMode] = useState(false)

  const toggleDebugMode = () => {
    setDebugMode(prev => !prev)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header debugMode={debugMode} onDebugToggle={toggleDebugMode} />
      <main className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        <Dashboard />
      </main>
      {debugMode && <DebugPanel />}
    </div>
  )
} 