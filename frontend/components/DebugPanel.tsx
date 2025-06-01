'use client'

import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export function DebugPanel() {
  const [connectionStatus, setConnectionStatus] = useState<{
    backend: 'checking' | 'connected' | 'failed'
    backendUrl: string
    error?: string
    lastCheck?: string
    testResults: string[]
  }>({
    backend: 'checking',
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeropass-backend.onrender.com',
    testResults: []
  })

  const addTestResult = (message: string) => {
    setConnectionStatus(prev => ({
      ...prev,
      testResults: [...prev.testResults.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]
    }))
  }

  const testConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, backend: 'checking', error: undefined }))
    addTestResult('Testing API connection...')
    
    try {
      console.log('🔄 Testing backend connection...')
      const health = await api.health()
      console.log('✅ Backend health check successful:', health)
      
      setConnectionStatus(prev => ({
        ...prev,
        backend: 'connected',
        lastCheck: new Date().toLocaleTimeString()
      }))
      addTestResult('✅ API connection successful')
    } catch (error: any) {
      console.error('❌ Backend health check failed:', error)
      
      setConnectionStatus(prev => ({
        ...prev,
        backend: 'failed',
        error: error.message,
        lastCheck: new Date().toLocaleTimeString()
      }))
      addTestResult(`❌ API failed: ${error.message}`)
    }
  }

  const testDirectFetch = async () => {
    addTestResult('Testing direct fetch...')
    try {
      console.log('🔄 Testing direct fetch to backend...')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch(`${connectionStatus.backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('✅ Direct fetch successful:', data)
      addTestResult('✅ Direct fetch successful')
      alert(`Direct fetch successful: ${JSON.stringify(data, null, 2)}`)
    } catch (error: any) {
      console.error('❌ Direct fetch failed:', error)
      addTestResult(`❌ Direct fetch failed: ${error.message}`)
      alert(`Direct fetch failed: ${error.message}`)
    }
  }

  const testCORSPreflight = async () => {
    addTestResult('Testing CORS preflight...')
    try {
      const response = await fetch(`${connectionStatus.backendUrl}/health`, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type',
          'Origin': window.location.origin
        }
      })
      
      console.log('CORS preflight response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      addTestResult(`✅ CORS preflight: ${response.status}`)
    } catch (error: any) {
      console.error('❌ CORS preflight failed:', error)
      addTestResult(`❌ CORS preflight failed: ${error.message}`)
    }
  }

  useEffect(() => {
    // Add environment info to test results
    addTestResult(`Environment: ${process.env.NODE_ENV}`)
    addTestResult(`Backend URL: ${connectionStatus.backendUrl}`)
    if (typeof window !== 'undefined') {
      addTestResult(`Client URL: ${window.location.origin}`)
    }
    
    testConnection()
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border shadow-lg rounded-lg p-4 max-w-sm max-h-96 overflow-y-auto">
      <h3 className="font-bold text-sm mb-3">🔧 Connection Debug</h3>
      
      <div className="space-y-3 text-sm">
        <div>
          <div className="font-medium">Backend URL:</div>
          <div className="text-xs text-gray-600 break-all">{connectionStatus.backendUrl}</div>
        </div>
        
        <div>
          <div className="font-medium">Status:</div>
          <div className={`inline-flex px-2 py-1 rounded text-xs ${
            connectionStatus.backend === 'connected' 
              ? 'bg-green-100 text-green-800' 
              : connectionStatus.backend === 'failed'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {connectionStatus.backend === 'connected' && '✅ Connected'}
            {connectionStatus.backend === 'failed' && '❌ Failed'}
            {connectionStatus.backend === 'checking' && '⏳ Checking...'}
          </div>
        </div>

        {connectionStatus.error && (
          <div>
            <div className="font-medium text-red-600">Error:</div>
            <div className="text-xs text-red-500 break-words">{connectionStatus.error}</div>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          <button
            onClick={testConnection}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            Retry API
          </button>
          <button
            onClick={testDirectFetch}
            className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
          >
            Direct Test
          </button>
          <button
            onClick={testCORSPreflight}
            className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
          >
            CORS Test
          </button>
        </div>

        {connectionStatus.testResults.length > 0 && (
          <div>
            <div className="font-medium mb-1">Test Log:</div>
            <div className="bg-gray-50 rounded p-2 text-xs space-y-1 max-h-32 overflow-y-auto">
              {connectionStatus.testResults.map((result, i) => (
                <div key={i} className="text-gray-700 break-words">{result}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 