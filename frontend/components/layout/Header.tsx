'use client'

import React, { useState, useEffect } from 'react'
import { Activity, FileText, Menu, X, User, Trash2, RefreshCw, Shield, Target, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { getCurrentUser, clearUserSession, clearAllCaches } from '@/lib/user'
import { api } from '@/lib/api'
import Image from 'next/image'

interface HeaderProps {
  debugMode: boolean
  onToggleDebug: () => void
}

export function Header({ debugMode, onToggleDebug }: HeaderProps) {
  const { activeTab, setActiveTab, clearUserData } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showSessionInfo, setShowSessionInfo] = useState(false)
  const [showLogoDropdown, setShowLogoDropdown] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    // Get current user info
    setCurrentUser(getCurrentUser())
  }, [])

  const tabs = [
    { id: 'rules' as const, label: 'Rule Builder', icon: Activity },
    { id: 'simulator' as const, label: 'API Simulator', icon: Activity },
    { id: 'testing' as const, label: 'Security Testing', icon: Target },
    { id: 'logs' as const, label: 'Evaluation Logs', icon: FileText },
  ]

  const handleSessionClick = () => {
    setShowSessionInfo(!showSessionInfo)
  }

  const handleClearSession = () => {
    if (confirm('Clear your session? This will remove all your data and create a new session.')) {
      // Clear all user data
      clearUserSession()
      clearAllCaches()
      clearUserData()
      api.clearCache()
      
      // Reload the page to reinitialize everything
      window.location.reload()
    }
  }

  const handleClearCache = () => {
    if (confirm('Clear cache? This will refresh your data from the server.')) {
      clearAllCaches()
      api.clearCache()
      window.location.reload()
    }
  }

  const formatSessionId = (sessionId: string) => {
    return sessionId.slice(-8) // Show last 8 characters
  }

  const formatUserId = (userId: string) => {
    return userId.slice(-8) // Show last 8 characters
  }

  return (
    <div className="sticky top-0 z-50 px-4 pt-4 transform scale-90 origin-top transition-all duration-300">
      <header className="bg-white/95 backdrop-blur-md shadow-lg border border-gray-200/50 rounded-2xl mx-auto max-w-7xl">
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title - Clickable for dropdown */}
            <div className="relative">
              <div 
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50/80 rounded-xl p-2 -m-2 transition-all duration-200 hover:scale-105"
                onClick={() => setShowLogoDropdown(!showLogoDropdown)}
                title="Click for options"
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
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showLogoDropdown ? 'rotate-180' : ''}`} />
              </div>

              {/* Logo Dropdown Menu */}
              {showLogoDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-2 z-50 animate-slideDown">
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        onToggleDebug()
                        setShowLogoDropdown(false)
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                        debugMode 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Activity className="h-4 w-4" />
                      <span>Debug Mode</span>
                      {debugMode && <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">ON</span>}
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTab('templates')
                        setShowLogoDropdown(false)
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Template Gallery</span>
                    </button>
                  </div>
                </div>
              )}
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

            {/* Desktop Status Indicator - Now Clickable */}
            <div className="hidden md:flex items-center space-x-3 relative">
              <button
                onClick={handleSessionClick}
                className="flex items-center space-x-2 bg-green-50/80 px-3 py-1.5 rounded-full border border-green-200/50 hover:bg-green-100 transition-all duration-200 transform hover:scale-105"
                title="Click to view session info"
              >
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                <span className="text-xs font-medium text-green-700">
                  Online {currentUser && `(${formatUserId(currentUser.id)})`}
                </span>
                <User className="h-3 w-3 text-green-600" />
              </button>

              {/* Session Info Dropdown */}
              {showSessionInfo && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 animate-slideDown">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Session Info</h3>
                      <button
                        onClick={() => setShowSessionInfo(false)}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                    
                    {currentUser && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">User ID:</span>
                          <code className="text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs">
                            {formatUserId(currentUser.id)}
                          </code>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Session:</span>
                          <code className="text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs">
                            {formatSessionId(currentUser.sessionId)}
                          </code>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span className="text-gray-900 text-xs">
                            {new Date(currentUser.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="border-t border-gray-200 pt-3 space-y-2">
                      <p className="text-xs text-gray-500">
                        Your data is private to this session. Other users cannot see your rules or logs.
                      </p>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={handleClearCache}
                          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Clear Cache</span>
                        </button>
                        
                        <button
                          onClick={handleClearSession}
                          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>New Session</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                
                {/* Mobile Session Info */}
                <div className="pt-3 border-t border-gray-200/30">
                  <button
                    onClick={handleSessionClick}
                    className="w-full flex items-center justify-between px-4 py-3 bg-green-50/80 rounded-xl text-sm font-medium border border-green-200/50"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                      <span className="text-green-700">Session Active</span>
                    </div>
                    <User className="h-4 w-4 text-green-600" />
                  </button>
                  
                  {showSessionInfo && currentUser && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                      <div className="text-xs text-gray-600">
                        <div>User: {formatUserId(currentUser.id)}</div>
                        <div>Session: {formatSessionId(currentUser.sessionId)}</div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleClearCache}
                          className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                        >
                          Clear Cache
                        </button>
                        <button
                          onClick={handleClearSession}
                          className="flex-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium"
                        >
                          New Session
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    </div>
  )
} 