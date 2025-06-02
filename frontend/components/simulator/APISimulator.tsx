'use client'

import React, { useState, useEffect } from 'react'
import { Play, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { useAppStore, useRuleSets } from '@/lib/store'
import { api, handleAPIError, generateJWTToken, validateIP } from '@/lib/api'
import type { SimulationRequest } from '@/lib/store'

export function APISimulator() {
  const ruleSets = useRuleSets()
  const { 
    simulationResult, 
    setSimulationResult, 
    addToHistory, 
    setLoading, 
    setError,
    setRuleSets 
  } = useAppStore()
  
  const [selectedRuleSet, setSelectedRuleSet] = useState('')
  const [clientIP, setClientIP] = useState('192.168.1.100')
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('/api/users')
  const [headers, setHeaders] = useState('{"Authorization": "Bearer <token>", "User-Agent": "curl/7.68.0"}')
  const [jwtToken, setJwtToken] = useState('')
  const [oauthScopes, setOauthScopes] = useState('read,write')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Periodically refresh rule sets to prevent stale data
  useEffect(() => {
    // Refresh immediately on component mount
    refreshRuleSets(false)
    
    // Then refresh every 60 seconds
    const intervalId = setInterval(() => {
      refreshRuleSets(false)
    }, 60000)
    
    return () => clearInterval(intervalId)
  }, [])

  const refreshRuleSets = async (showFeedback = true) => {
    if (showFeedback) {
      setIsRefreshing(true)
    }
    
    try {
      // Clear cache but don't risk deleting custom rule sets
      api.clearCachePattern('templates')
      api.clearCachePattern('scenarios')
      
      const freshRuleSets = await api.getRuleSets()
      
      // Only update if we get rule sets back - never replace with empty array
      if (freshRuleSets.length > 0) {
        setRuleSets(freshRuleSets)
      }
      
      if (showFeedback) {
        setError(`✅ Rule sets refreshed successfully (${freshRuleSets.length} found)`)
        setTimeout(() => setError(undefined), 3000)
      }
    } catch (error) {
      if (showFeedback) {
        setError(`Failed to refresh rule sets: ${handleAPIError(error)}`)
      }
    } finally {
      if (showFeedback) {
        setIsRefreshing(false)
      }
    }
  }

  const handleSimulate = async () => {
    if (!selectedRuleSet) {
      setError('Please select a rule set')
      return
    }

    try {
      setLoading(true)
      setError(undefined)

      let parsedHeaders = {}
      try {
        parsedHeaders = JSON.parse(headers)
      } catch {
        parsedHeaders = {}
      }

      const request: SimulationRequest = {
        rule_set_id: selectedRuleSet,
        client_ip: clientIP,
        method,
        path,
        headers: parsedHeaders,
        jwt_token: jwtToken || undefined,
        oauth_scopes: oauthScopes.split(',').map(s => s.trim()).filter(Boolean),
      }

      console.log(`Starting simulation with rule set: ${selectedRuleSet}`)
      
      // First verify that the rule set exists but don't replace user's selection automatically
      let validRuleSetId = selectedRuleSet
      let ruleSetWarning = false
      
      try {
        // Get rule sets without clearing cache to avoid data loss
        const availableRuleSets = await api.getRuleSets()
        if (!availableRuleSets.some(rs => rs.id === selectedRuleSet)) {
          if (availableRuleSets.length > 0) {
            // Flag for warning but don't auto-change - the API will handle it
            ruleSetWarning = true
            console.log(`⚠️ Warning: Selected rule set may not exist on server`)
          }
        }
      } catch (verifyError) {
        console.warn('Failed to verify rule set existence:', verifyError)
        // Continue anyway, as the API client has its own fallback
      }
      
      if (ruleSetWarning) {
        setError(`⚠️ Warning: Selected rule set may not exist on the server. Simulation will use a fallback.`)
        // Don't auto-clear this warning
      }

      const result = await api.simulate(request)
      
      // Check if this was a fallback evaluation
      if (result.evaluation_details.some(detail => detail.includes('fallback'))) {
        setError(`⚠️ Using fallback evaluation. The backend '/simulate' endpoint might be unavailable.`)
      }
      
      // If rule set was substituted, update the selected rule set in the UI
      const substitutionNote = result.evaluation_details.find(detail => detail.includes('Originally requested rule set'))
      if (substitutionNote) {
        // Try to extract the used rule set ID from the note
        const match = substitutionNote.match(/Using rule set ([a-f0-9-]+) instead/)
        if (match && match[1]) {
          const actualRuleSetId = match[1]
          console.log(`Updating selected rule set to ${actualRuleSetId} based on substitution`)
          setSelectedRuleSet(actualRuleSetId)
        }
      }
      
      setSimulationResult(result)
      addToHistory(result)
    } catch (error) {
      setError(handleAPIError(error))
    } finally {
      setLoading(false)
    }
  }

  const generateSampleJWT = () => {
    const token = generateJWTToken({
      sub: 'user123',
      role: 'admin',
      permissions: ['read', 'write']
    })
    setJwtToken(token)
  }

  return (
    <div className="space-y-5 animate-slideUp">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h2 className="text-xl font-bold text-gray-900">API Request Simulator</h2>
        <p className="text-gray-600 mt-1">Test API requests against your firewall rules</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Request Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Simulate API Request</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">Configure the request parameters to test</p>
          </div>
          
          <div className="space-y-5">
            {/* Rule Set Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">Rule Set</label>
                <button
                  onClick={() => refreshRuleSets(true)}
                  disabled={isRefreshing}
                  className="text-sm text-blue-600 flex items-center space-x-1 hover:text-blue-800 transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="text-xs">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
              <select 
                value={selectedRuleSet} 
                onChange={(e) => setSelectedRuleSet(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200 bg-white"
              >
                <option value="">Select a rule set</option>
                {ruleSets.map((rs) => (
                  <option key={rs.id} value={rs.id}>{rs.name}</option>
                ))}
              </select>
              {ruleSets.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No rule sets found. Create rule sets in the Rule Builder tab first.
                </p>
              )}
            </div>

            {/* Client IP */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Client IP Address</label>
              <input
                type="text"
                value={clientIP}
                onChange={(e) => setClientIP(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                placeholder="e.g., 192.168.1.100"
              />
              {clientIP && !validateIP(clientIP) && (
                <p className="text-sm text-red-600 animate-slideDown">Invalid IP address format</p>
              )}
            </div>

            {/* HTTP Method & Path */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Method</label>
                <select 
                  value={method} 
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200 bg-white"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Path</label>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                  placeholder="/api/endpoint"
                />
              </div>
            </div>

            {/* Headers */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Headers (JSON)</label>
              <textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono transition-all duration-200 resize-none"
                rows={3}
                placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
              />
            </div>

            {/* JWT Token */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <label className="block text-sm font-medium text-gray-700">JWT Token</label>
                <button
                  type="button"
                  onClick={generateSampleJWT}
                  className="mt-1 sm:mt-0 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200"
                >
                  Generate Sample
                </button>
              </div>
              <textarea
                value={jwtToken}
                onChange={(e) => setJwtToken(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono transition-all duration-200 resize-none"
                rows={2}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
            </div>

            {/* OAuth Scopes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">OAuth2 Scopes</label>
              <input
                type="text"
                value={oauthScopes}
                onChange={(e) => setOauthScopes(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                placeholder="read,write,admin"
              />
              <p className="text-sm text-gray-500">Comma-separated list of scopes</p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSimulate}
              disabled={!selectedRuleSet || !clientIP}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="h-4 w-4" />
              <span>Simulate Request</span>
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Simulation Result</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">Response from firewall evaluation</p>
          </div>
          
          <div className="min-h-[400px] flex items-center justify-center">
            {simulationResult ? (
              <div className="w-full space-y-5 animate-fadeIn">
                {/* Fallback Warning */}
                {simulationResult.evaluation_details.some(detail => detail.includes('fallback')) && (
                  <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-sm">
                    <strong>⚠️ Fallback Evaluation:</strong> This is a simplified evaluation because the backend simulation
                    endpoint is unavailable. Some complex rules may not be evaluated correctly.
                  </div>
                )}
                
                {/* Rule Set Substitution Warning */}
                {simulationResult.evaluation_details.some(detail => detail.includes('Originally requested rule set')) && (
                  <div className="p-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-sm">
                    <strong>ℹ️ Rule Set Substitution:</strong> The originally requested rule set was not found.
                    The simulator is using an alternative rule set instead.
                  </div>
                )}

                {/* Decision */}
                <div className={`
                  p-4 rounded-xl border-2 flex items-start space-x-3 transition-all duration-300
                  ${simulationResult.decision === 'ALLOWED' 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'bg-red-50 border-red-200 hover:bg-red-100'
                  }
                `}>
                  {simulationResult.decision === 'ALLOWED' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className={`
                      font-semibold text-lg
                      ${simulationResult.decision === 'ALLOWED' 
                        ? 'text-green-800' 
                        : 'text-red-800'
                      }
                    `}>
                      {simulationResult.decision}
                    </h4>
                    <p className={`
                      text-sm mt-1 break-words
                      ${simulationResult.decision === 'ALLOWED' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                      }
                    `}>
                      {simulationResult.reason}
                    </p>
                  </div>
                </div>

                {/* Matched Rule */}
                {simulationResult.matched_rule && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Matched Rule</h5>
                    <p className="text-sm text-gray-600 font-mono bg-gray-50 p-3 rounded-lg border break-all">
                      {simulationResult.matched_rule}
                    </p>
                  </div>
                )}

                {/* Evaluation Details */}
                {simulationResult.evaluation_details.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Evaluation Details</h5>
                    <div className="space-y-2">
                      {simulationResult.evaluation_details.map((detail, index) => (
                        <div key={index} className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg border-l-3 border-blue-300 hover:bg-gray-100 transition-colors duration-200">
                          <span className="h-1.5 w-1.5 bg-gray-400 rounded-full flex-shrink-0 mt-2"></span>
                          <span className="text-sm text-gray-600 break-words">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50 animate-bounce-slow" />
                <p className="text-lg font-medium">Run a simulation to see results</p>
                <p className="text-sm mt-1">Configure your request and click "Simulate Request"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 