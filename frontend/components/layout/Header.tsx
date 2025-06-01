'use client'

import React, { useState } from 'react'
import { Shield, Activity, FileText, Menu, X } from 'lucide-react'
import { useAppStore } from '@/lib/store'

interface HeaderProps {
  debugMode: boolean
  onToggleDebug: () => void
}

export function Header({ debugMode, onToggleDebug }: HeaderProps) {
  const { activeTab, setActiveTab } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const tabs = [
    { id: 'rules' as const, label: 'Rule Builder', icon: Shield },
    { id: 'simulator' as const, label: 'API Simulator', icon: Activity },
    { id: 'logs' as const, label: 'Evaluation Logs', icon: FileText },
  ]

  return (
    <header className="bg-white shadow-sm border-b transform scale-90 origin-top transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo and Title - Clickable for debug toggle */}
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors duration-200"
            onClick={onToggleDebug}
            title="Click to toggle debug mode"
          >
            <div className={`p-2 bg-blue-600 rounded-lg transition-all duration-300 ${debugMode ? 'ring-2 ring-blue-300 ring-offset-2' : ''}`}>
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">ZeroPass</h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                Firewall Simulator {debugMode && '(Debug Mode)'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm' 
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

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Desktop Status Indicator */}
          <div className="hidden md:flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-600">Online</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 animate-slideDown">
            <nav className="py-2 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left transform hover:scale-[1.02]
                      ${isActive 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
              {/* Mobile Status */}
              <div className="flex items-center justify-center space-x-2 pt-2 border-t border-gray-200">
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-600">Online</span>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
} 