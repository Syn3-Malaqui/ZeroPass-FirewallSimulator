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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Evaluation Logs</h2>
        <div className="space-x-2">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            onClick={clearLogs}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Clear All
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center p-4">Loading logs...</div>
      ) : evaluationLogs.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded border">
          No evaluation logs found. Simulate requests to generate logs.
        </div>
      ) : (
        <div className="space-y-4">
          {evaluationLogs.map((log, index) => (
            <div key={index} className="p-4 bg-white rounded shadow">
              <div className="flex justify-between mb-2">
                <span className="font-semibold">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    log.result.decision === 'ALLOWED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {log.result.decision}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div>
                  <span className="text-gray-600">Rule Set:</span> {log.rule_set_id}
                </div>
                <div>
                  <span className="text-gray-600">Client IP:</span> {log.client_ip}
                </div>
              </div>
              <div className="mb-2">
                <span className="text-gray-600">Reason:</span> {log.result.reason}
              </div>
              {log.result.matched_rule && (
                <div className="mb-2">
                  <span className="text-gray-600">Matched Rule:</span>{' '}
                  {log.result.matched_rule}
                </div>
              )}
              <div className="mt-3 border-t pt-2">
                <div className="font-semibold mb-1">Evaluation Details:</div>
                <ul className="list-disc list-inside pl-2 text-sm text-gray-700">
                  {log.result.evaluation_details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 