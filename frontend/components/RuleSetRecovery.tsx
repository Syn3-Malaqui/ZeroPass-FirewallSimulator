import React, { useState } from 'react'
import { AlertTriangle, Shield, CheckCircle, RefreshCcw } from 'lucide-react'
import { recoverRuleSetsFromPreviousSessions } from '../lib/user'
import { api } from '../lib/api'

export function RuleSetRecovery({ onComplete }: { onComplete: () => void }) {
  const [isRecovering, setIsRecovering] = useState(false)
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    recoveredCount: number;
  } | null>(null)

  const handleRecovery = async () => {
    setIsRecovering(true)
    setResult(null)
    
    try {
      const recoveryResult = await recoverRuleSetsFromPreviousSessions(api)
      setResult(recoveryResult)
      
      if (recoveryResult.success && recoveryResult.recoveredCount > 0) {
        // Force a refresh of the rule sets after recovery
        api.clearCachePattern('rules')
        // Wait a bit before calling onComplete
        setTimeout(() => {
          onComplete()
        }, 1500)
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoveredCount: 0
      })
    } finally {
      setIsRecovering(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 my-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Shield className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Missing Rule Sets?
          </h3>
          <p className="text-gray-600 mb-4">
            If your rule sets have disappeared, the system can attempt to recover them from previous sessions.
          </p>
          
          {result && (
            <div className={`rounded-lg p-4 mb-4 ${
              result.success 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {result.success 
                    ? <CheckCircle className="h-5 w-5 text-green-500" /> 
                    : <AlertTriangle className="h-5 w-5 text-red-500" />}
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium">
                    {result.success ? 'Recovery Successful' : 'Recovery Failed'}
                  </h4>
                  <p className="text-sm mt-1">{result.message}</p>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={handleRecovery}
            disabled={isRecovering || result?.success}
            className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              isRecovering || result?.success
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }`}
          >
            {isRecovering ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Recovering...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Recover Rule Sets
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 