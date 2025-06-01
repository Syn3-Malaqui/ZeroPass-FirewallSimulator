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
    
    // Set up interval to periodically refresh rule sets
    const intervalId = setInterval(() => {
      console.log('Automatic refresh of rule sets')
      loadData()
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(intervalId)
  }, [])
  
  // Force reload when the component becomes visible
  useEffect(() => {
    const visibilityHandler = () => {
      if (!document.hidden) {
        console.log('TestRunner became visible, refreshing data')
        loadData()
      }
    }
    
    document.addEventListener('visibilitychange', visibilityHandler)
    return () => document.removeEventListener('visibilitychange', visibilityHandler)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Clear cache first to ensure fresh data
      api.clearCache()
      
      const [fetchedScenarios, fetchedRuleSets] = await Promise.all([
        api.getScenarios(),
        api.getRuleSets()
      ])
      
      console.log('Loaded data:', {
        scenarios: fetchedScenarios.length,
        ruleSets: fetchedRuleSets.length,
        ruleSetIds: fetchedRuleSets.map(rs => rs.id)
      })
      
      setScenarios(fetchedScenarios)
      setLocalScenarios(fetchedScenarios)
      setLocalRuleSets(fetchedRuleSets)
      
      // Reset selections if they no longer exist
      if (selectedRuleSet && !fetchedRuleSets.some(rs => rs.id === selectedRuleSet)) {
        console.log(`Selected rule set ${selectedRuleSet} no longer exists, resetting selection`)
        setSelectedRuleSet('')
      }
      
      if (selectedScenario && !fetchedScenarios.some(s => s.id === selectedScenario.id)) {
        console.log(`Selected scenario no longer exists, resetting selection`)
        setSelectedScenario(null)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      alert('Failed to load testing data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredScenarios = selectedCategory === 'all' 
    ? scenarios 
    : scenarios.filter(s => s.category === selectedCategory)

  const categories = ['all', ...Array.from(new Set(scenarios.map(s => s.category)))]

  const runTest = async () => {
    if (!selectedScenario || !selectedRuleSet) return

    try {
      setIsRunning(true)
      setTestResult(null)
      
      console.log(`Running test for scenario: ${selectedScenario.id}, rule set: ${selectedRuleSet}`)
      console.log('Available rule sets:', localRuleSets.map(rs => ({id: rs.id, name: rs.name})))
      
      // Verify the rule set exists before testing
      const ruleSetExists = localRuleSets.some(rs => rs.id === selectedRuleSet)
      if (!ruleSetExists) {
        throw new Error(`Rule set ${selectedRuleSet} not found. Please reload the rule sets.`)
      }
      
      const result = await api.testScenario(selectedScenario.id, selectedRuleSet)
      setTestResult(result)
      addTestResult(result)
    } catch (error: any) {
      console.error('Failed to run test:', error)
      alert(`Test error: ${error.message || 'Unknown error'}. Try reloading rule sets.`)
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
                onChange={(e) => {
                  console.log(`Rule set selected: ${e.target.value}`)
                  setSelectedRuleSet(e.target.value)
                }}
                className="flex-1 px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a rule set to test...</option>
                {localRuleSets.length > 0 ? (
                  localRuleSets.map((ruleSet) => (
                    <option key={ruleSet.id} value={ruleSet.id}>
                      {ruleSet.name} ({ruleSet.id.substring(0, 8)})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No rule sets available</option>
                )}
              </select>
              <button 
                onClick={() => {
                  api.clearCache() // Force clear cache
                  loadData()
                }}
                className="px-3 py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition-colors"
                title="Reload rule sets"
              >
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
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

TestRunner.displayName = 'TestRunner'