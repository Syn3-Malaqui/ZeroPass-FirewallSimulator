'use client'

import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getCurrentUserId } from '@/lib/user'
import { Loader2, RefreshCw, CheckCircle, XCircle, Server, Globe, User } from 'lucide-react'

export default function DiagnosticsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [apiStatus, setApiStatus] = useState<{ [key: string]: { success: boolean, message: string, data?: any } }>({})
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setIsLoading(true)
    setError(null)
    const results: { [key: string]: { success: boolean, message: string, data?: any } } = {}

    try {
      // Check backend health
      try {
        const health = await api.health()
        results.health = { 
          success: true, 
          message: 'Backend health check successful',
          data: health
        }
        setHealthStatus(health)
      } catch (error: any) {
        results.health = { 
          success: false, 
          message: `Backend health check failed: ${error.message || 'Unknown error'}`
        }
        setError(`Backend health check failed: ${error.message || 'Unknown error'}`)
      }

      // Check rule sets
      try {
        const ruleSets = await api.getRuleSets()
        results.ruleSets = { 
          success: true, 
          message: `Successfully loaded ${ruleSets.length} rule sets`,
          data: ruleSets.map(rs => ({ id: rs.id, name: rs.name }))
        }
      } catch (error: any) {
        results.ruleSets = { 
          success: false, 
          message: `Failed to load rule sets: ${error.message || 'Unknown error'}`
        }
      }

      // Check templates
      try {
        const templates = await api.getTemplates()
        results.templates = { 
          success: true, 
          message: `Successfully loaded ${templates.length} templates`,
          data: templates.map(t => ({ id: t.id, name: t.name }))
        }
      } catch (error: any) {
        results.templates = { 
          success: false, 
          message: `Failed to load templates: ${error.message || 'Unknown error'}`
        }
      }

      // Check scenarios
      try {
        const scenarios = await api.getScenarios()
        results.scenarios = { 
          success: true, 
          message: `Successfully loaded ${scenarios.length} scenarios`,
          data: scenarios.map(s => ({ id: s.id, name: s.name }))
        }
      } catch (error: any) {
        results.scenarios = { 
          success: false, 
          message: `Failed to load scenarios: ${error.message || 'Unknown error'}`
        }
      }

      // Try to auto-create a rule set if none exist
      if (results.ruleSets.success && results.ruleSets.data && results.ruleSets.data.length === 0) {
        try {
          const ruleSetId = await api.ensureRuleSetExists()
          results.autoCreateRuleSet = { 
            success: true, 
            message: `Successfully auto-created rule set: ${ruleSetId}`,
            data: { ruleSetId }
          }
        } catch (error: any) {
          results.autoCreateRuleSet = { 
            success: false, 
            message: `Failed to auto-create rule set: ${error.message || 'Unknown error'}`
          }
        }
      }

      setApiStatus(results)
    } catch (error: any) {
      setError(`Diagnostics failed: ${error.message || 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">ZeroPass Backend Diagnostics</h1>
          <div className="flex items-center space-x-2">
            <a 
              href="/"
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span>Back to App</span>
            </a>
            <button
              onClick={runDiagnostics}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{isLoading ? 'Running...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* System Info */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Backend URL:</span>
              </div>
              <p className="ml-7 mt-1 text-sm break-all">{api.getBackendUrl ? api.getBackendUrl() : 'Not available'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-green-500" />
                <span className="font-medium">User ID:</span>
              </div>
              <p className="ml-7 mt-1 text-sm break-all">{getCurrentUserId()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <Server className="h-5 w-5 text-purple-500" />
                <span className="font-medium">Environment:</span>
              </div>
              <p className="ml-7 mt-1 text-sm">{process.env.NODE_ENV}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <Server className="h-5 w-5 text-orange-500" />
                <span className="font-medium">Health Check Endpoint:</span>
              </div>
              <p className="ml-7 mt-1 text-sm">{healthStatus?._diagnostics?.endpoint || 'Unknown'}</p>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800">API Status</h2>
          <div className="space-y-4">
            {Object.entries(apiStatus).map(([key, status]) => (
              <div key={key} className={`p-4 rounded-lg border ${status.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {status.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <h3 className="font-medium text-gray-900 capitalize">{key}</h3>
                  </div>
                  <span className={`text-sm ${status.success ? 'text-green-700' : 'text-red-700'}`}>
                    {status.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <p className="mt-2 text-sm ml-7">{status.message}</p>
                {status.data && (
                  <div className="mt-2 ml-7">
                    <details>
                      <summary className="text-sm text-blue-600 cursor-pointer">Show Details</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(status.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
            {Object.keys(apiStatus).length === 0 && !isLoading && (
              <div className="p-4 text-center text-gray-500">No results available</div>
            )}
            {isLoading && (
              <div className="p-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                <p className="mt-2 text-gray-600">Running diagnostics...</p>
              </div>
            )}
          </div>
        </div>

        {/* Troubleshooting Tips */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-blue-800">Troubleshooting Tips</h2>
          <ul className="list-disc list-inside text-sm text-blue-900 space-y-1">
            <li>If health check fails, verify that the backend server is running</li>
            <li>If rule sets can't be loaded, try creating a new rule set from a template</li>
            <li>If you're seeing 404 errors, check if the backend endpoints are correctly configured</li>
            <li>Try refreshing the page and running diagnostics again</li>
            <li>Clear your browser cache and cookies if persistent issues occur</li>
            <li>Check that your internet connection is stable</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 