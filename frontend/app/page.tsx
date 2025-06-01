import React from 'react'
import { Header } from '@/components/layout/Header'
import { Dashboard } from '@/components/Dashboard'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        <Dashboard />
      </main>
    </div>
  )
} 