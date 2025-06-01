'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Menu, X, User, RefreshCw, Trash2, Edit2, Check, X as XIcon, Activity, FileText } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useUserSession } from '@/lib/userSession'

interface HeaderProps {
  debugMode: boolean
  onDebugToggle: () => void
}

export function Header({ debugMode, onDebugToggle }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  
  const { sessionInfo, updateName, resetSession, clearCache } = useUserSession()
  const { userStats, resetSession: storeResetSession, activeTab, setActiveTab } = useAppStore()

  const tabs = [
    { id: 'rules' as const, label: 'Rule Builder', icon: Activity },
    { id: 'simulator' as const, label: 'API Simulator', icon: Activity },
    { id: 'logs' as const, label: 'Evaluation Logs', icon: FileText },
  ]

  const handleEditName = () => {
    setTempName(sessionInfo.name)
    setIsEditingName(true)
  }

  const handleSaveName = () => {
    if (tempName.trim()) {
      updateName(tempName.trim())
    }
    setIsEditingName(false)
  }

  const handleCancelEdit = () => {
    setTempName('')
    setIsEditingName(false)
  }

  const handleResetSession = () => {
    if (confirm('Are you sure you want to reset your session? This will clear all your rules, simulations, and logs.')) {
      resetSession()
      storeResetSession()
      setIsSessionMenuOpen(false)
    }
  }

  const handleClearCache = () => {
    clearCache()
    setIsSessionMenuOpen(false)
  }

  return (
    <div className="sticky top-0 z-50 px-4 pt-4 transform scale-90 origin-top transition-all duration-300">
      <header className="bg-white/95 backdrop-blur-md shadow-lg border border-gray-200/50 rounded-2xl mx-auto max-w-7xl">
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title - Clickable for debug toggle */}
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50/80 rounded-xl p-2 -m-2 transition-all duration-200 hover:scale-105"
              onClick={onDebugToggle}
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

            {/* User Session & Mobile Menu */}
            <div className="flex items-center space-x-3">
              {/* User Session Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsSessionMenuOpen(!isSessionMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-50/80 hover:bg-gray-100 rounded-xl border border-gray-200/50 transition-all duration-200 hover:shadow-sm"
                >
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="h-3 w-3 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-medium text-gray-900 truncate max-w-32">
                      {sessionInfo.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      #{sessionInfo.shortId}
                    </div>
                  </div>
                </button>

                {/* Session Dropdown Menu */}
                {isSessionMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Session Info</h3>
                        <button
                          onClick={() => setIsSessionMenuOpen(false)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                      
                      {/* Session Name Edit */}
                      <div className="mb-3">
                        {isEditingName ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Session name"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveName()
                                if (e.key === 'Escape') handleCancelEdit()
                              }}
                            />
                            <button
                              onClick={handleSaveName}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <XIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {sessionInfo.name}
                            </span>
                            <button
                              onClick={handleEditName}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {sessionInfo.shortId}
                        </div>
                      </div>

                      {/* User Stats */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-blue-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-blue-600">{userStats.rule_sets}</div>
                          <div className="text-xs text-blue-600">Rules</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-green-600">{userStats.simulations}</div>
                          <div className="text-xs text-green-600">Sims</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-purple-600">{userStats.logs}</div>
                          <div className="text-xs text-purple-600">Logs</div>
                        </div>
                      </div>
                    </div>

                    {/* Session Actions */}
                    <div className="p-4 space-y-2">
                      <button
                        onClick={handleClearCache}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Clear Cache</span>
                      </button>
                      
                      <button
                        onClick={handleResetSession}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Reset Session</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-200 transform hover:scale-105"
                >
                  {isMobileMenuOpen ? (
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
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
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
                        setIsMobileMenuOpen(false)
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