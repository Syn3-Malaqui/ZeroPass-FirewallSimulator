'use client'

import React, { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { RuleBuilder } from './rules/RuleBuilder'
import { APISimulator } from './simulator/APISimulator'
import { LogViewer } from './logs/LogViewer'

export function Dashboard() {
  const { activeTab, isLoading, error, initializeSession } = useAppStore()

  // Initialize user session silently in the background
  useEffect(() => {
    initializeSession()
  }, [initializeSession])

  return (
    <>
      {/* Full Screen Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white p-6 rounded-xl shadow-2xl flex items-center space-x-4 animate-fadeIn">
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-8 w-8 border border-blue-300 opacity-20"></div>
            </div>
            <div>
              <p className="text-gray-700 font-medium">Loading...</p>
              <p className="text-gray-500 text-sm">Please wait</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container with Consistent Scaling */}
      <div className="transform scale-90 origin-top transition-all duration-300">
        {/* Error Display */}
        {error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl shadow-sm animate-slideDown">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-1 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content with smooth transitions */}
        <div className="min-h-[70vh] relative">
          {/* Rules Tab */}
          <div className={`transition-all duration-300 ${
            activeTab === 'rules' 
              ? 'opacity-100 translate-y-0 relative' 
              : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
          }`}>
            <RuleBuilder />
          </div>

          {/* Simulator Tab */}
          <div className={`transition-all duration-300 ${
            activeTab === 'simulator' 
              ? 'opacity-100 translate-y-0 relative' 
              : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
          }`}>
            <APISimulator />
          </div>

          {/* Logs Tab */}
          <div className={`transition-all duration-300 ${
            activeTab === 'logs' 
              ? 'opacity-100 translate-y-0 relative' 
              : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
          }`}>
            <LogViewer />
          </div>
        </div>
      </div>
    </>
  )
} 