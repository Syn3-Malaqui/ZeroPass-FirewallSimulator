'use client'

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Play, Shield, AlertTriangle, CheckCircle, XCircle, Target, BarChart3, Download, Loader2, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import type { ExploitScenario, ScenarioTestResult, FirewallRuleSet } from '@/lib/store'

const categoryIcons = {
  'Injection Attacks': AlertTriangle,
  'Authentication Bypass': Shield,
  'DoS/DDoS': Target,
  'Data Exfiltration': BarChart3,
}

const categoryColors = {
  'Injection Attacks': 'bg-red-50 text-red-700 border-red-200',
  'Authentication Bypass': 'bg-orange-50 text-orange-700 border-orange-200',
  'DoS/DDoS': 'bg-purple-50 text-purple-700 border-purple-200',
  'Data Exfiltration': 'bg-yellow-50 text-yellow-700 border-yellow-200',
}

interface TestRunnerProps {
  onClose?: () => void
}

export type TestRunnerRefType = {
  forceReload: () => void
}

export const TestRunner = forwardRef<TestRunnerRefType, TestRunnerProps>(({ onClose }, ref) => {
  const { setScenarios, getScenarios, getRuleSets, addTestResult } = useAppStore()
  const [scenarios, setLocalScenarios] = useState<ExploitScenario[]>([])
  const [localRuleSets, setLocalRuleSets] = useState<FirewallRuleSet[]>([])
  const [selectedScenario, setSelectedScenario] = useState<ExploitScenario | null>(null)
  const [selectedRuleSet, setSelectedRuleSet] = useState<string>('')
  const [testResult, setTestResult] = useState<ScenarioTestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Expose forceReload function to parent component
  useImperativeHandle(ref, () => ({
    forceReload: loadData
  }))

  useEffect(() => {
    loadData()
  }, [])

  // Reload data periodically to prevent stale rule sets
  useEffect(() => {
    // Reload when the component mounts and every 60 seconds after that
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing test data...')
      loadData()
    }, 60000) // Every 60 seconds
    
    // Clean up on unmount
    return () => clearInterval(intervalId)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Clear cache first to ensure fresh data
      api.clearCache()
      
      // First load rule sets, then scenarios
      const fetchedRuleSets = await api.getRuleSets()
      console.log('Loaded rule sets:', {
        count: fetchedRuleSets.length,
        ids: fetchedRuleSets.map(rs => rs.id)
      })
      
      if (fetchedRuleSets.length === 0) {
        console.warn('No rule sets found - attempting to create one automatically')
        try {
          // Attempt to create a rule set automatically
          const ruleSetId = await api.ensureRuleSetExists()
          console.log('Created rule set automatically:', ruleSetId)
          
          // Reload rule sets after creation
          const refreshedRuleSets = await api.getRuleSets()
          setLocalRuleSets(refreshedRuleSets)
          setSelectedRuleSet(ruleSetId) // Auto-select the created rule set
        } catch (error) {
          console.error('Failed to auto-create rule set:', error)
        }
      } else {
        setLocalRuleSets(fetchedRuleSets)
      }
      
      const fetchedScenarios = await api.getScenarios()
      console.log('Loaded scenarios:', {
        count: fetchedScenarios.length
      })
      
      setScenarios(fetchedScenarios)
      setLocalScenarios(fetchedScenarios)
      
      // Clear selections if previously selected items don't exist anymore
      if (selectedRuleSet && !fetchedRuleSets.some(rs => rs.id === selectedRuleSet)) {
        console.log('Previously selected rule set no longer exists, clearing selection')
        setSelectedRuleSet('')
      }
      
      if (selectedScenario && !fetchedScenarios.some(s => s.id === selectedScenario?.id)) {
        console.log('Previously selected scenario no longer exists, clearing selection')
        setSelectedScenario(null)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Remove mobile-specific effects that may cause race conditions
  useEffect(() => {
    // Just verify rule set exists when selection changes, don't force reload
    if (selectedRuleSet && localRuleSets.length > 0) {
      const ruleSetExists = localRuleSets.some(rs => rs.id === selectedRuleSet)
      if (!ruleSetExists) {
        console.warn(`Selected rule set ${selectedRuleSet} not found in loaded rule sets`)
        setSelectedRuleSet('')
      }
    }
  }, [selectedRuleSet, localRuleSets])

  const filteredScenarios = selectedCategory === 'all' 
    ? scenarios 
    : scenarios.filter(s => s.category === selectedCategory)

  const categories = ['all', ...Array.from(new Set(scenarios.map(s => s.category)))]

  const runTest = async () => {
    if (!selectedScenario || !selectedRuleSet) {
      console.error('Missing scenario or rule set selection')
      return
    }

    try {
      setIsRunning(true)
      setTestResult(null)
      
      // Clear cache first to ensure absolutely fresh data
      api.clearCache()
      
      console.log(`Running test with scenario ${selectedScenario.id} and rule set ${selectedRuleSet}`)
      
      // Verify rule set exists before running test (with guaranteed fresh data)
      console.log('🔍 Verifying rule set exists before testing...')
      const freshRuleSets = await api.getRuleSets()
      const ruleSetExists = freshRuleSets.some(rs => rs.id === selectedRuleSet)
      
      if (!ruleSetExists) {
        console.error(`Rule set with ID ${selectedRuleSet} not found in available rule sets:`, freshRuleSets.map(rs => rs.id))
        throw new Error(`Rule set with ID ${selectedRuleSet} not found. Please refresh the page and select another rule set.`)
      }
      
      try {
        const result = await api.testScenario(selectedScenario.id, selectedRuleSet)
        console.log('Test result:', result)
        setTestResult(result)
        addTestResult(result)
      } catch (error: any) {
        // If the test fails with a 404, try one more time with a fresh cache
        if (error.message && error.message.includes('Rule set not found') && error.status === 404) {
          console.log('🔄 First attempt failed with 404, trying again with fresh cache...')
          // Force a complete cache reset
          api.clearCache()
          await new Promise(resolve => setTimeout(resolve, 300)) // Small delay
          const result = await api.testScenario(selectedScenario.id, selectedRuleSet)
          console.log('Second attempt test result:', result)
          setTestResult(result)
          addTestResult(result)
        } else {
          throw error // Re-throw if it's not a 404 or second attempt
        }
      }
    } catch (error: any) {
      console.error('Failed to run test:', error)
      
      let errorMessage = error.message || 'Unknown error'
      
      // Handle specific error cases
      if (errorMessage.includes('Rule set not found') || errorMessage.includes('404')) {
        errorMessage = `Rule set not found. This might be due to a session issue. Please try the following:
1. Click the Reload Rule Sets button below
2. If that doesn't work, refresh the page
3. If still failing, try creating a new rule set`
        
        // Clear selection to prevent repeated failures
        setSelectedRuleSet('')
        // Reload data
        await loadData()
      }
      
      alert(`Test failed: ${errorMessage}`)
    } finally {
      setIsRunning(false)
    }
  }

  const exportResults = () => {
    if (!testResult) return

    const data = {
      scenario: selectedScenario?.name,
      ruleSet: localRuleSets.find(rs => rs.id === selectedRuleSet)?.name,
      timestamp: new Date().toISOString(),
      results: testResult
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading scenarios...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-0 mb-0" style={{marginBottom: 0, paddingBottom: 0}}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Security Testing</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Test your firewall rules against common attack scenarios
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="self-end px-3 py-1.5 sm:px-4 sm:py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* Main Content - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 pb-0 mb-0" style={{marginBottom: 0, paddingBottom: 0}}>
        {/* Left Panel - Scenario Selection */}
        <div className="space-y-3 sm:space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Select Attack Scenario</h3>
            
            {/* Category Filter - Improved Touch Target Sizes */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4 -mx-0.5 px-0.5">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category === 'all' ? 'All Categories' : category}
                </button>
              ))}
            </div>

            {/* Scenarios List - Improved for Mobile */}
            <div className="space-y-1.5 sm:space-y-2 max-h-44 sm:max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-1 sm:p-2">
              {filteredScenarios.map((scenario) => {
                const IconComponent = categoryIcons[scenario.category as keyof typeof categoryIcons] || AlertTriangle
                const colorClass = categoryColors[scenario.category as keyof typeof categoryColors] || categoryColors['Injection Attacks']
                
                return (
                  <div
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario)}
                    className={`p-1.5 sm:p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedScenario?.id === scenario.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className={`p-1 sm:p-1.5 rounded border ${colorClass}`}>
                        <IconComponent className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base text-gray-900 truncate">{scenario.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 line-clamp-2">{scenario.description}</p>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-2">
                          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium border ${colorClass}`}>
                            {scenario.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {scenario.test_requests.length} tests
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {filteredScenarios.length === 0 && (
                <div className="flex items-center justify-center h-16 sm:h-24 text-gray-500 text-sm">
                  No scenarios found for this category
                </div>
              )}
            </div>
          </div>

          {/* Rule Set Selection - Improved Touch Target */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-3">Select Rule Set</h3>
            <div className="flex space-x-2">
              <select
                value={selectedRuleSet}
                onChange={(e) => setSelectedRuleSet(e.target.value)}
                className="flex-1 px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a rule set to test...</option>
                {localRuleSets.map((ruleSet) => (
                  <option key={ruleSet.id} value={ruleSet.id}>
                    {ruleSet.name}
                  </option>
                ))}
              </select>
              <button 
                onClick={loadData}
                disabled={loading}
                className="px-3 py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition-colors disabled:opacity-50"
                title="Reload rule sets"
              >
                <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {localRuleSets.length === 0 && (
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-amber-600">
                No rule sets found. Create rule sets in the Rule Builder tab first, then click the reload button.
              </p>
            )}
          </div>

          {/* Run Test Button - More Touch-Friendly */}
          <button
            onClick={runTest}
            disabled={!selectedScenario || !selectedRuleSet || isRunning}
            className="w-full bg-blue-600 text-white py-2 sm:py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 touch-manipulation mt-1 sm:mt-0"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                <span className="text-sm sm:text-base font-medium">Running Test...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base font-medium">Run Security Test</span>
              </>
            )}
          </button>
        </div>

        {/* Right Panel - Test Results - Mobile Optimized */}
        <div className="space-y-2 sm:space-y-4 bg-gray-50 p-2 sm:p-4 rounded-lg border border-gray-200" style={{marginBottom: 0, paddingBottom: 0}}>
          <div className="flex items-center justify-between mb-1 sm:mb-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Test Results</h3>
            {testResult && (
              <button
                onClick={exportResults}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Export</span>
              </button>
            )}
          </div>

          {testResult ? (
            <div className="space-y-2 sm:space-y-4" style={{marginBottom: 0, paddingBottom: 0}}>
              {/* Summary Cards - More Compact on Mobile */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Passed</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600 mt-0.5 sm:mt-1">
                    {testResult.passed_tests}
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Failed</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-red-600 mt-0.5 sm:mt-1">
                    {testResult.failed_tests}
                  </div>
                </div>
              </div>

              {/* Coverage Score - Improved for Mobile */}
              <div className={`p-2 sm:p-4 rounded-lg border ${getScoreBgColor(testResult.coverage_score)}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-gray-900">Coverage Score</span>
                  <span className={`text-lg sm:text-2xl font-bold ${getScoreColor(testResult.coverage_score)}`}>
                    {testResult.coverage_score.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mt-1 sm:mt-2">
                  <div
                    className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 ${
                      testResult.coverage_score >= 80 ? 'bg-green-500' :
                      testResult.coverage_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${testResult.coverage_score}%` }}
                  />
                </div>
              </div>

              {/* Test Details - Better Mobile Scrolling */}
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-2">Test Details</h4>
                <div className="space-y-1 sm:space-y-2 max-h-40 sm:max-h-64 overflow-y-auto pr-1 -mr-1" style={{maxHeight: 'min(40vh, 160px)'}}>
                  {testResult.test_details.map((test, index) => (
                    <div
                      key={index}
                      className={`p-1.5 sm:p-3 rounded-lg border ${
                        test.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-1.5 sm:space-x-2">
                          {test.passed ? (
                            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
                          )}
                          <span className="text-xs sm:text-sm font-medium">
                            Test {test.test_number}
                          </span>
                        </div>
                        <span className={`text-2xs sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${
                          test.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {test.actual_result}
                        </span>
                      </div>
                      <p className="text-2xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">{test.description}</p>
                      <p className="text-2xs sm:text-xs text-gray-500 mt-0.5 sm:mt-1">{test.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 sm:py-12">
              <Target className="h-6 w-6 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-1 sm:mb-4" />
              <h4 className="text-xs sm:text-lg font-medium text-gray-900 mb-0.5 sm:mb-2">No Test Results</h4>
              <p className="text-2xs sm:text-sm text-gray-600 max-w-xs mx-auto px-2 pb-0">
                Select a scenario and rule set, then run a test.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}) 