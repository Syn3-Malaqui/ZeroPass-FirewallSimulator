'use client'

import React from 'react'
import { useAppStore } from '@/lib/store'
import { RuleBuilder } from './rules/RuleBuilder'
import { APISimulator } from './simulator/APISimulator'
import { LogViewer } from './logs/LogViewer'

export function Dashboard() {
  const { activeTab, isLoading, error } = useAppStore()

  return (
    <div className="transform scale-90 origin-top">
      {/* Error Display */}
      {error && (
        <div className="mb-5 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium">Error</h3>
              <div className="mt-1 text-sm">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[70vh]">
        {activeTab === 'rules' && <RuleBuilder />}
        {activeTab === 'simulator' && <APISimulator />}
        {activeTab === 'logs' && <LogViewer />}
      </div>
    </div>
  )
}

// Fixed Vercel deployment issue by using LogViewer instead of EvaluationLogs 