'use client'

import React, { useState } from 'react'
import { Play, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { api, handleAPIError, generateJWTToken, validateIP } from '@/lib/api'
import type { SimulationRequest } from '@/lib/store'

export function APISimulator() {
  const { 
    ruleSets, 
    simulationResult, 
    setSimulationResult, 
    addToHistory, 
    setLoading, 
    setError 
  } = useAppStore()
  
  const [selectedRuleSet, setSelectedRuleSet] = useState('')
  const [clientIP, setClientIP] = useState('192.168.1.100')
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('/api/users')
  const [headers, setHeaders] = useState('{"Authorization": "Bearer <token>", "User-Agent": "curl/7.68.0"}')
  const [jwtToken, setJwtToken] = useState('')
  const [oauthScopes, setOauthScopes] = useState('read,write')

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

      const result = await api.simulate(request)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-bold text-gray-900">API Request Simulator</h2>
        <p className="text-gray-600 mt-1">Test API requests against your firewall rules</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Request Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Simulate API Request</h3>
            <p className="text-sm text-gray-600 mt-1">Configure the request parameters to test</p>
          </div>
          
          <div className="space-y-6">
            {/* Rule Set Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rule Set</label>
              <select 
                value={selectedRuleSet} 
                onChange={(e) => setSelectedRuleSet(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a rule set</option>
                {ruleSets.map((rs) => (
                  <option key={rs.id} value={rs.id}>{rs.name}</option>
                ))}
              </select>
            </div>

            {/* Client IP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client IP Address</label>
              <input
                type="text"
                value={clientIP}
                onChange={(e) => setClientIP(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 192.168.1.100"
              />
              {clientIP && !validateIP(clientIP) && (
                <p className="text-sm text-red-600 mt-1">Invalid IP address format</p>
              )}
            </div>

            {/* HTTP Method & Path */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
                <select 
                  value={method} 
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Path</label>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="/api/endpoint"
                />
              </div>
            </div>

            {/* Headers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Headers (JSON)</label>
              <textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                rows={4}
                placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
              />
            </div>

            {/* JWT Token */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">JWT Token</label>
                <button
                  type="button"
                  onClick={generateSampleJWT}
                  className="mt-2 sm:mt-0 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Generate Sample
                </button>
              </div>
              <textarea
                value={jwtToken}
                onChange={(e) => setJwtToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                rows={3}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
            </div>

            {/* OAuth Scopes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">OAuth2 Scopes</label>
              <input
                type="text"
                value={oauthScopes}
                onChange={(e) => setOauthScopes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="read,write,admin"
              />
              <p className="text-sm text-gray-500 mt-1">Comma-separated list of scopes</p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSimulate}
              disabled={!selectedRuleSet || !clientIP}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Play className="h-5 w-5" />
              <span>Simulate Request</span>
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Simulation Result</h3>
            <p className="text-sm text-gray-600 mt-1">Response from firewall evaluation</p>
          </div>
          
          <div>
            {simulationResult ? (
              <div className="space-y-6">
                {/* Decision */}
                <div className={`
                  p-4 rounded-lg border-2 flex items-start space-x-3
                  ${simulationResult.decision === 'ALLOWED' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                  }
                `}>
                  {simulationResult.decision === 'ALLOWED' ? (
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
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
                        <div key={index} className="flex items-start space-x-2 p-2 bg-gray-50 rounded border-l-2 border-blue-200">
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
                <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-50" />
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