'use client'

import React, { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const initializeUserSession = useAppStore(state => state.initializeUserSession)
  
  useEffect(() => {
    // Initialize user session on app start
    initializeUserSession()
    
    // Clear cache on page refresh to prevent backend overload
    const handleBeforeUnload = () => {
      api.clearCache()
    }
    
    const handleVisibilityChange = () => {
      // Clear cache when tab becomes hidden to save memory
      if (document.hidden) {
        api.clearCache()
      }
    }
    
    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [initializeUserSession])
  
  return (
    <>
      {children}
    </>
  )
} 