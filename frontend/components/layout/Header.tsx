'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X, User, RefreshCw, Trash2, Edit2, Check, X as XIcon } from 'lucide-react'
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
  const { userStats, resetSession: storeResetSession } = useAppStore()

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
    <div className="sticky top-0 z-50 px-4 py-4">
      <header className="bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-lg max-w-7xl mx-auto">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <button
                onClick={onDebugToggle}
                className={`
                  flex items-center space-x-3 text-lg font-bold text-gray-900 
                  hover:text-blue-600 transition-all duration-200 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-1
                  ${debugMode ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
                `}
                aria-label="Toggle debug mode"
              >
                <div className={`
                  w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl 
                  flex items-center justify-center shadow-lg transition-all duration-200
                  hover:scale-105 hover:shadow-xl
                  ${debugMode ? 'ring-2 ring-blue-400 ring-offset-2 animate-pulse' : ''}
                `}>
                  <Image
                    src="/favicon/favicon.svg"
                    alt="ZeroPass Logo"
                    width={24}
                    height={24}
                    priority
                    className="w-6 h-6"
                  />
                </div>
                <span className="hidden sm:block">ZeroPass</span>
              </button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <div className="bg-gray-50/80 backdrop-blur-sm rounded-2xl p-1 border border-gray-200/50">
                <Link 
                  href="/" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all duration-200"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/rules" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all duration-200"
                >
                  Rules
                </Link>
                <Link 
                  href="/simulator" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all duration-200"
                >
                  Simulator
                </Link>
                <Link 
                  href="/logs" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all duration-200"
                >
                  Logs
                </Link>
              </div>
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

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 text-gray-600" />
                ) : (
                  <Menu className="h-5 w-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 mt-4 pt-4 pb-4 animate-slideDown">
              <nav className="space-y-2">
                <Link 
                  href="/" 
                  className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-all duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/rules" 
                  className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-all duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Rules
                </Link>
                <Link 
                  href="/simulator" 
                  className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-all duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Simulator
                </Link>
                <Link 
                  href="/logs" 
                  className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-all duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Logs
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>
    </div>
  )
} 