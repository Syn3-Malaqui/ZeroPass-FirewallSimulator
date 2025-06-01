'use client'

import React, { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { 
  Shield, 
  Activity, 
  FileText, 
  Plus, 
  Play, 
  Eye,
  User,
  Database,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useUserSession } from '@/lib/userSession'

export function Dashboard() {
  const { 
    ruleSets, 
    evaluationLogs, 
    simulationHistory,
    userStats,
    isLoading, 
    error, 
    setLoading, 
    setError,
    setRuleSets,
    setEvaluationLogs,
    clearCache
  } = useAppStore()
  
  const { sessionInfo, resetSession } = useUserSession()
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')

  // Load initial data
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(undefined)
    setConnectionStatus('checking')
    
    try {
      // Test backend connection
      await api.health()
      setConnectionStatus('connected')
      
      // Load user data
      const [rules, logs] = await Promise.all([
        api.getRuleSets(),
        api.getLogs(50)
      ])
      
      setRuleSets(rules)
      setEvaluationLogs(logs)
      
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error)
      setError(error.message)
      setConnectionStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    clearCache()
    loadDashboardData()
  }

  const handleResetSession = () => {
    if (confirm('Are you sure you want to reset your session? This will clear all your rules, simulations, and logs.')) {
      resetSession()
      loadDashboardData()
    }
  }

  const recentLogs = evaluationLogs.slice(0, 5)
  const recentSimulations = simulationHistory.slice(0, 5)

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-200 max-w-md w-full mx-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Dashboard</h3>
              <p className="text-sm text-gray-600">Initializing your private workspace...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 pt-8 transform scale-90 origin-top transition-all duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* User Session Header */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome, {sessionInfo.name}</h1>
                <p className="text-sm text-gray-600">
                  Session ID: #{sessionInfo.shortId} • Private Workspace
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                connectionStatus === 'connected' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : connectionStatus === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-500 animate-pulse' 
                    : connectionStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-yellow-500 animate-pulse'
                }`}></div>
                <span>
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'error' ? 'Disconnected' : 'Connecting'}
                </span>
              </div>
              
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="Refresh data"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 animate-fadeIn">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={loadDashboardData}
                className="mt-2 text-sm text-red-800 hover:text-red-900 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rule Sets</p>
                <p className="text-3xl font-bold text-blue-600">{userStats.rule_sets}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link 
                href="/rules"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Manage Rules →
              </Link>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Simulations</p>
                <p className="text-3xl font-bold text-green-600">{userStats.simulations}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link 
                href="/simulator"
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Run Simulation →
              </Link>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Evaluation Logs</p>
                <p className="text-3xl font-bold text-purple-600">{userStats.logs}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link 
                href="/logs"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                View Logs →
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            href="/rules"
            className="group bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create Rule Set</h3>
                <p className="text-sm text-gray-600">Build new firewall rules</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/simulator"
            className="group bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors">
                <Play className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Test Request</h3>
                <p className="text-sm text-gray-600">Simulate API calls</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/logs"
            className="group bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">View Activity</h3>
                <p className="text-sm text-gray-600">Check evaluation logs</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Simulations */}
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-600" />
                <span>Recent Simulations</span>
              </h3>
            </div>
            <div className="p-6">
              {recentSimulations.length > 0 ? (
                <div className="space-y-3">
                  {recentSimulations.map((sim, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          sim.decision === 'ALLOWED' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {sim.decision}
                          </p>
                          <p className="text-xs text-gray-500">{sim.reason}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {sim.timestamp && new Date(sim.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No simulations yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Logs */}
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <span>Recent Logs</span>
              </h3>
            </div>
            <div className="p-6">
              {recentLogs.length > 0 ? (
                <div className="space-y-3">
                  {recentLogs.map((log) => (
                    <div key={log.timestamp} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          log.result.decision === 'ALLOWED' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {log.client_ip}
                          </p>
                          <p className="text-xs text-gray-500">{log.result.decision}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No logs yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Session Info */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200/50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Private Workspace</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Your data is isolated from other users. Only you can see your rules, simulations, and logs.
                </p>
                <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Session: {sessionInfo.shortId}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Data Isolated</span>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleResetSession}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-all duration-200"
            >
              Reset Session
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 