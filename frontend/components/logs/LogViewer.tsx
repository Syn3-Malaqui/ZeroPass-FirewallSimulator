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
    <div className="transform scale-90 origin-top space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl font-bold">Evaluation Logs</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            Refresh
          </button>
          <button
            onClick={clearLogs}
            disabled={isLoading}
            className="w-full sm:w-auto px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          >
            Clear All
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center p-6">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading logs...</p>
        </div>
      ) : evaluationLogs.length === 0 ? (
        <div className="text-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600">No evaluation logs found. Simulate requests to generate logs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {evaluationLogs.map((log, index) => (
            <div key={index} className="p-4 sm:p-5 bg-white rounded-lg shadow border">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                <div className="text-sm font-medium text-gray-900">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    log.result.decision === 'ALLOWED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {log.result.decision}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-sm">
                <div>
                  <span className="text-gray-500 font-medium">Rule Set:</span>
                  <div className="text-gray-900 break-all">{log.rule_set_id}</div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Client IP:</span>
                  <div className="text-gray-900">{log.client_ip}</div>
                </div>
              </div>

              <div className="mb-3">
                <span className="text-gray-500 font-medium text-sm">Reason:</span>
                <div className="text-gray-900 text-sm mt-1 break-words">{log.result.reason}</div>
              </div>

              {log.result.matched_rule && (
                <div className="mb-3">
                  <span className="text-gray-500 font-medium text-sm">Matched Rule:</span>
                  <div className="text-gray-900 text-sm mt-1 font-mono bg-gray-50 px-2 py-1 rounded">
                    {log.result.matched_rule}
                  </div>
                </div>
              )}

              <div className="border-t pt-3">
                <div className="font-medium text-sm text-gray-700 mb-2">Evaluation Details:</div>
                <div className="space-y-1">
                  {log.result.evaluation_details.map((detail, i) => (
                    <div key={i} className="text-xs text-gray-600 bg-gray-50 px-2 py-1.5 rounded border-l-2 border-blue-200 break-words">
                      {detail}
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