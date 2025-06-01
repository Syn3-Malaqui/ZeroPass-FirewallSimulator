'use client'

import React, { useState } from 'react'
import { Activity, FileText, Menu, X } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import Image from 'next/image'

interface HeaderProps {
  debugMode: boolean
  onToggleDebug: () => void
}

export function Header({ debugMode, onToggleDebug }: HeaderProps) {
  const { activeTab, setActiveTab } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const tabs = [
    { id: 'rules' as const, label: 'Rule Builder', icon: Activity },
    { id: 'simulator' as const, label: 'API Simulator', icon: Activity },
    { id: 'logs' as const, label: 'Evaluation Logs', icon: FileText },
  ]

  return (
    <div className="sticky top-0 z-50 px-4 pt-4 transform scale-90 origin-top transition-all duration-300">
      <header className="bg-white/95 backdrop-blur-md shadow-lg border border-gray-200/50 rounded-2xl mx-auto max-w-7xl">
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title - Clickable for debug toggle */}
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50/80 rounded-xl p-2 -m-2 transition-all duration-200 hover:scale-105"
              onClick={onToggleDebug}
              title="Click to toggle debug mode"
            >
              <div className={`relative w-10 h-10 transition-all duration-300 ${debugMode ? 'ring-2 ring-blue-300/50 ring-offset-2 ring-offset-white rounded-xl' : ''}`}>
                <Image
                  src="/favicon/favicon.svg"
                  alt="ZeroPass Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">ZeroPass</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Firewall Simulator {debugMode && '(Debug Mode)'}
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2 bg-gray-50/80 rounded-xl p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95
                      ${isActive 
                        ? 'bg-white text-blue-700 shadow-md border border-blue-100/50' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
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
                className="p-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-200 transform hover:scale-105"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Desktop Status Indicator */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-green-50/80 px-3 py-1.5 rounded-full border border-green-200/50">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                <span className="text-xs font-medium text-green-700">Online</span>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200/30 animate-slideDown">
              <nav className="py-4 space-y-2">
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
                        w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-left transform hover:scale-[1.02] active:scale-[0.98]
                        ${isActive 
                          ? 'bg-blue-50/80 text-blue-700 border border-blue-200/50 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
                {/* Mobile Status */}
                <div className="flex items-center justify-center space-x-2 pt-3 border-t border-gray-200/30">
                  <div className="flex items-center space-x-2 bg-green-50/80 px-3 py-1.5 rounded-full border border-green-200/50">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                    <span className="text-xs font-medium text-green-700">Online</span>
                  </div>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    </div>
  )
} 