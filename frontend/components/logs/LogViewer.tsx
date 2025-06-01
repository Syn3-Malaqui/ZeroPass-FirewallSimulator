'use client'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'

export function LogViewer() {
  const { evaluationLogs, setEvaluationLogs } = useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const logs = await api.getLogs()
      setEvaluationLogs(logs)
    } catch (err) {
      setError('Failed to load logs. Please try again later.')
      console.error('Error fetching logs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearLogs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await api.clearLogs()
      setEvaluationLogs([])
    } catch (err) {
      setError('Failed to clear logs. Please try again later.')
      console.error('Error clearing logs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <div className="space-y-4 animate-slideUp">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Evaluation Logs</h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor firewall rule evaluations in real-time
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={clearLogs}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            Clear All
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl animate-slideDown">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center p-8">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-8 w-8 border border-blue-300 opacity-20"></div>
          </div>
          <p className="mt-3 text-gray-600 font-medium">Loading logs...</p>
        </div>
      ) : evaluationLogs.length === 0 ? (
        <div className="text-center p-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 text-lg font-medium">No evaluation logs found</p>
          <p className="text-gray-500 text-sm mt-1">Simulate requests to generate logs</p>
        </div>
      ) : (
        <div className="space-y-4">
          {evaluationLogs.map((log, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] animate-slideUp"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                    log.result.decision === 'ALLOWED'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {log.result.decision}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-500 font-medium text-sm">Rule Set:</span>
                  <div className="text-gray-900 text-sm mt-1 break-all font-mono">{log.rule_set_id}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-500 font-medium text-sm">Client IP:</span>
                  <div className="text-gray-900 text-sm mt-1 font-mono">{log.client_ip}</div>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-gray-500 font-medium text-sm">Reason:</span>
                <div className="text-gray-900 text-sm mt-2 p-3 bg-gray-50 rounded-lg break-words">
                  {log.result.reason}
                </div>
              </div>

              {log.result.matched_rule && (
                <div className="mb-4">
                  <span className="text-gray-500 font-medium text-sm">Matched Rule:</span>
                  <div className="text-gray-900 text-sm mt-2 font-mono bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 break-all">
                    {log.result.matched_rule}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <div className="font-medium text-sm text-gray-700 mb-3 flex items-center space-x-2">
                  <span>Evaluation Details:</span>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {log.result.evaluation_details.length} steps
                  </span>
                </div>
                <div className="space-y-2">
                  {log.result.evaluation_details.map((detail, i) => (
                    <div 
                      key={i} 
                      className="text-xs text-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-2 rounded-lg border-l-3 border-blue-300 break-words hover:from-gray-100 hover:to-gray-200 transition-all duration-200"
                    >
                      <span className="font-medium text-gray-700">Step {i + 1}:</span> {detail}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 