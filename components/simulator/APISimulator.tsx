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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">API Request Simulator</h2>
        <p className="text-gray-600">Test API requests against your firewall rules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Simulate API Request</h3>
            <p className="card-description">Configure the request parameters to test</p>
          </div>
          
          <div className="card-content space-y-4">
            {/* Rule Set Selection */}
            <div>
              <label className="label">Rule Set</label>
              <select 
                value={selectedRuleSet} 
                onChange={(e) => setSelectedRuleSet(e.target.value)}
                className="select"
              >
                <option value="">Select a rule set</option>
                {ruleSets.map((rs) => (
                  <option key={rs.id} value={rs.id}>{rs.name}</option>
                ))}
              </select>
            </div>

            {/* Client IP */}
            <div>
              <label className="label">Client IP Address</label>
              <input
                type="text"
                value={clientIP}
                onChange={(e) => setClientIP(e.target.value)}
                className="input"
                placeholder="e.g., 192.168.1.100"
              />
              {clientIP && !validateIP(clientIP) && (
                <p className="text-sm text-danger-600 mt-1">Invalid IP address format</p>
              )}
            </div>

            {/* HTTP Method & Path */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Method</label>
                <select 
                  value={method} 
                  onChange={(e) => setMethod(e.target.value)}
                  className="select"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              
              <div className="col-span-2">
                <label className="label">Path</label>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="input"
                  placeholder="/api/endpoint"
                />
              </div>
            </div>

            {/* Headers */}
            <div>
              <label className="label">Headers (JSON)</label>
              <textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                className="textarea"
                rows={4}
                placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
              />
            </div>

            {/* JWT Token */}
            <div>
              <div className="flex items-center justify-between">
                <label className="label">JWT Token</label>
                <button
                  type="button"
                  onClick={generateSampleJWT}
                  className="btn-secondary text-xs"
                >
                  Generate Sample
                </button>
              </div>
              <textarea
                value={jwtToken}
                onChange={(e) => setJwtToken(e.target.value)}
                className="textarea"
                rows={3}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
            </div>

            {/* OAuth Scopes */}
            <div>
              <label className="label">OAuth2 Scopes</label>
              <input
                type="text"
                value={oauthScopes}
                onChange={(e) => setOauthScopes(e.target.value)}
                className="input"
                placeholder="read,write,admin"
              />
              <p className="text-sm text-gray-500 mt-1">Comma-separated list of scopes</p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSimulate}
              disabled={!selectedRuleSet || !clientIP}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Simulate Request</span>
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Simulation Result</h3>
            <p className="card-description">Response from firewall evaluation</p>
          </div>
          
          <div className="card-content">
            {simulationResult ? (
              <div className="space-y-4">
                {/* Decision */}
                <div className={`
                  p-4 rounded-lg border-2 flex items-center space-x-3
                  ${simulationResult.decision === 'ALLOWED' 
                    ? 'bg-success-50 border-success-200' 
                    : 'bg-danger-50 border-danger-200'
                  }
                `}>
                  {simulationResult.decision === 'ALLOWED' ? (
                    <CheckCircle className="h-6 w-6 text-success-600" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-danger-600" />
                  )}
                  <div>
                    <h4 className={`
                      font-semibold
                      ${simulationResult.decision === 'ALLOWED' 
                        ? 'text-success-800' 
                        : 'text-danger-800'
                      }
                    `}>
                      {simulationResult.decision}
                    </h4>
                    <p className={`
                      text-sm
                      ${simulationResult.decision === 'ALLOWED' 
                        ? 'text-success-600' 
                        : 'text-danger-600'
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
                    <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                      {simulationResult.matched_rule}
                    </p>
                  </div>
                )}

                {/* Evaluation Details */}
                {simulationResult.evaluation_details.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Evaluation Details</h5>
                    <div className="space-y-1">
                      {simulationResult.evaluation_details.map((detail, index) => (
                        <p key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                          <span className="h-1 w-1 bg-gray-400 rounded-full"></span>
                          <span>{detail}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Run a simulation to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 