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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <Header debugMode={debugMode} onDebugToggle={toggleDebugMode} />
      
      <main className="relative">
        <Dashboard />
      </main>
      
      {debugMode && <DebugPanel />}
    </div>
  )
} 