'use client'

import React from 'react'
import { Shield, Activity, FileText } from 'lucide-react'
import { useAppStore } from '@/lib/store'

export function Header() {
  const { activeTab, setActiveTab } = useAppStore()

  const tabs = [
    { id: 'rules' as const, label: 'Rule Builder', icon: Shield },
    { id: 'simulator' as const, label: 'API Simulator', icon: Activity },
    { id: 'logs' as const, label: 'Evaluation Logs', icon: FileText },
  ]

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ZeroPass</h1>
              <p className="text-sm text-gray-500">Firewall Simulator</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors
                    ${isActive 
                      ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 bg-success-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Online</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
} 