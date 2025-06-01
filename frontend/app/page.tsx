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
    <div className="sm:min-h-screen h-auto bg-gradient-to-br from-gray-50 to-gray-100" style={{overflowX: 'hidden', overflowY: 'auto'}}>
      <Header debugMode={debugMode} onToggleDebug={toggleDebugMode} />
      <main className="container mx-auto px-4 py-2 sm:py-8 max-w-7xl" style={{paddingBottom: 0, marginBottom: 0}}>
        <Dashboard />
      </main>
      {debugMode && <DebugPanel />}
    </div>
  )
} 