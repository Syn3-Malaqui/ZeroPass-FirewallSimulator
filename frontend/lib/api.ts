import axios from 'axios'
import type { FirewallRuleSet, SimulationRequest, SimulationResult, EvaluationLog, RuleTemplate, ExploitScenario, ScenarioTestResult } from './store'
import { getCurrentUserId, addUserIdToData, filterByCurrentUser } from './user'

// Keep a cached version of the backend URL for consistency
let cachedBackendUrl: string | null = null;

const getBackendUrl = () => {
  if (cachedBackendUrl) {
    return cachedBackendUrl;
  }
  
  // First check for mobile - use production URL if screen is small
  if (typeof window !== 'undefined' && window.innerWidth < 768 && process.env.NODE_ENV === 'production') {
    cachedBackendUrl = 'https://zeropass-backend.onrender.com';
    return cachedBackendUrl;
  }
  
  // Then check for runtime environment variable
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    cachedBackendUrl = 'https://zeropass-backend.onrender.com';
    return cachedBackendUrl;
  }

  // Then check for Next.js environment variable
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    cachedBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    return cachedBackendUrl;
  }

  // Default to Render backend in production
  if (process.env.NODE_ENV === 'production') {
    cachedBackendUrl = 'https://zeropass-backend.onrender.com';
    return cachedBackendUrl;
  }

  // Local development fallback
  cachedBackendUrl = 'http://localhost:8000';
  return cachedBackendUrl;
};

// Log API configuration
if (typeof window !== 'undefined') {
console.log('🌐 API Configuration:')
console.log('NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL)
  console.log('API_BASE_URL:', getBackendUrl())
console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('Window location:', typeof window !== 'undefined' ? window.location.hostname : 'SSR')
}

// Create axios instance with user isolation
const apiClient = axios.create({
  baseURL: getBackendUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to include user ID
apiClient.interceptors.request.use((config) => {
  config.headers['X-User-ID'] = getCurrentUserId()
  return config
})

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 404 && error.response?.data?.detail?.includes('Rule set not found')) {
      console.error('🚫 Rule set not found - this may be due to session issues')
      // Clear relevant caches when rule set is not found
      clearUserCache()
    }
    return Promise.reject(error)
  }
)

export class APIError extends Error {
  status?: number
  
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'APIError'
    this.status = status
  }
}

export function handleAPIError(error: any): string {
  if (error instanceof APIError) {
    return error.message
  }
  
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) {
      return `Resource not found. ${error.response?.data?.detail || 'Please refresh and try again.'}`
    }
    
    if (error.response && error.response.status >= 500) {
      return `Server error: ${error.response?.data?.detail || error.message}`
    }
    
    if (error.response?.data?.detail) {
      return error.response.data.detail
    }
  }
  
  return error.message || 'An unexpected error occurred'
}

// Improved caching with better invalidation
const CACHE_DURATION = 30000 // 30 seconds - shorter for better consistency
const userCache = new Map<string, Map<string, { data: any, timestamp: number }>>()

function getUserCache() {
  const userId = getCurrentUserId()
  if (!userCache.has(userId)) {
    userCache.set(userId, new Map())
  }
  return userCache.get(userId)!
}

function getCacheKey(key: string): string {
  return `${key}_${getCurrentUserId()}`
}

function getFromCache(key: string): any | null {
  const cache = getUserCache()
  const cached = cache.get(key)
  
  if (!cached) return null
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    cache.delete(key)
    return null
  }
  
  return cached.data
}

function setCache(key: string, data: any): void {
  const cache = getUserCache()
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

function clearUserCache(): void {
  const userId = getCurrentUserId()
  userCache.delete(userId)
  clearSessionData() // Clear all session data for this user
}

function invalidateCache(pattern?: string): void {
  const cache = getUserCache()
  if (pattern) {
    // Clear specific pattern using Array.from to handle iterators properly
    const keys = Array.from(cache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.delete(key)
      }
    })
  } else {
    // Clear all cache
    cache.clear()
  }
  
  // Also clear session storage
  clearSessionData()
}

// Session-specific storage to prevent cross-session data leaks
const SESSION_STORAGE_PREFIX = 'zeropass_session_'

function getSessionStorageKey(key: string): string {
  const userId = getCurrentUserId()
  return `${SESSION_STORAGE_PREFIX}${userId}_${key}`
}

function setSessionData(key: string, data: any): void {
  if (typeof window === 'undefined') return
  
  try {
    const sessionKey = getSessionStorageKey(key)
    sessionStorage.setItem(sessionKey, JSON.stringify({
      data,
      userId: getCurrentUserId(),
      timestamp: Date.now()
    }))
  } catch (error) {
    console.warn('Failed to store session data:', error)
  }
}

function getSessionData(key: string): any | null {
  if (typeof window === 'undefined') return null
  
  try {
    const sessionKey = getSessionStorageKey(key)
    const stored = sessionStorage.getItem(sessionKey)
    
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    
    // Verify it belongs to current user
    if (parsed.userId !== getCurrentUserId()) {
      sessionStorage.removeItem(sessionKey)
      return null
    }
    
    // Check if data is fresh (shorter duration for better consistency)
    if (Date.now() - parsed.timestamp > 15000) { // 15 seconds
      sessionStorage.removeItem(sessionKey)
      return null
    }
    
    return parsed.data
  } catch (error) {
    console.warn('Failed to retrieve session data:', error)
    return null
  }
}

function clearSessionData(key?: string): void {
  if (typeof window === 'undefined') return
  
  const userId = getCurrentUserId()
  
  if (key) {
    // Clear specific key
    const sessionKey = getSessionStorageKey(key)
    sessionStorage.removeItem(sessionKey)
  } else {
    // Clear all session data for current user
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith(`${SESSION_STORAGE_PREFIX}${userId}_`)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key))
  }
}

export const api = {
  // Clear user cache manually
  clearCache: () => {
    clearUserCache()
    invalidateCache()
  },

  // Clear specific cache patterns
  clearCachePattern: (pattern: string) => {
    invalidateCache(pattern)
  },

  // Export getBackendUrl function
  getBackendUrl,

  // Health check with fallback endpoints
  async health() {
    try {
      const endpoints = [
        '/health',          // Standard endpoint
        '/api/health',      // Common deployment pattern
        '/healthcheck',     // Alternative name
        '/api/healthcheck', // Alternative with prefix
        '/'                 // Root fallback
      ]
      
      // Try each endpoint in order until one works
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying health check endpoint: ${getBackendUrl()}${endpoint}`)
          const response = await fetch(`${getBackendUrl()}${endpoint}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-User-ID': getCurrentUserId()
            }
          })

          if (response.ok) {
            const data = await response.json()
            // Log which endpoint worked
            console.log(`✅ Health check successful using endpoint: ${endpoint}`)
            
            // Add diagnostics information
            return {
              ...data,
              _diagnostics: {
                endpoint: endpoint,
                backend_url: getBackendUrl(),
                timestamp: new Date().toISOString(),
                user_id: getCurrentUserId()
              }
            }
          }
        } catch (endpointError) {
          console.warn(`Health check failed for ${endpoint}:`, endpointError)
          // Continue to the next endpoint
        }
      }
      
      // If we reach here, all endpoints failed
      throw new APIError('Health check failed on all endpoints', 503)
    } catch (error) {
      console.error('Health check error:', error)
      throw error instanceof APIError 
        ? error 
        : new APIError(`Health check error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  // Rule Set Management - with improved caching and error handling
  async getRuleSets(): Promise<FirewallRuleSet[]> {
    const cacheKey = getCacheKey('rules')
    const cached = getFromCache(cacheKey)
    if (cached) return cached

    try {
      console.log(`Fetching rule sets from ${getBackendUrl()}/rules`)
      const response = await fetch(`${getBackendUrl()}/rules`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-User-ID': getCurrentUserId()
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API Error (${response.status}):`, errorText)
        throw new APIError(`Failed to load rule sets: ${response.statusText}`, response.status)
      }

      const ruleSets = await response.json()
      console.log(`Successfully fetched ${ruleSets.length} rule sets`)
      
      setCache(cacheKey, ruleSets)
      return ruleSets
    } catch (error) {
      console.error('Rule sets fetch error:', error)
      throw error instanceof APIError 
        ? error 
        : new APIError(`Failed to load rule sets: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  async getRuleSet(id: string): Promise<FirewallRuleSet> {
    try {
      const response = await apiClient.get(`/rules/${id}`)
      const ruleSet = response.data
      
      // Verify ownership
      if (ruleSet.userId && ruleSet.userId !== getCurrentUserId()) {
        throw new Error('Access denied: This rule set belongs to another user')
      }
      
      if (!ruleSet.userId) {
        // Legacy rule set, assign to current user
        return addUserIdToData(ruleSet)
      }
      
      return ruleSet
    } catch (error) {
      console.error('Failed to fetch rule set:', error)
      throw error
    }
  },

  async createRuleSet(ruleSet: FirewallRuleSet): Promise<{ status: string; rule_set_id: string }> {
    const userRuleSet = addUserIdToData(ruleSet)
    console.log('🔒 Creating rule set for user:', getCurrentUserId())
    
    try {
      const response = await apiClient.post('/rules', userRuleSet)
      clearUserCache() // Clear cache after mutation
      return response.data
    } catch (error) {
      console.error('Failed to create rule set:', error)
      throw error
    }
  },

  async updateRuleSet(ruleSet: FirewallRuleSet): Promise<{ status: string; rule_set_id: string }> {
    const userRuleSet = addUserIdToData(ruleSet)
    
    // Verify ownership before update
    if (ruleSet.userId && ruleSet.userId !== getCurrentUserId()) {
      throw new Error('Access denied: Cannot update another user\'s rule set')
    }
    
    console.log('🔒 Updating rule set for user:', getCurrentUserId())
    
    try {
      const response = await apiClient.post('/rules', userRuleSet)
      clearUserCache() // Clear cache after mutation
      return response.data
    } catch (error) {
      console.error('Failed to update rule set:', error)
      throw error
    }
  },

  async deleteRuleSet(id: string): Promise<{ status: string; message: string }> {
    console.log('🔒 Deleting rule set for user:', getCurrentUserId())
    
    try {
      const response = await apiClient.delete(`/rules/${id}`)
      clearUserCache() // Clear cache after mutation
      return response.data
    } catch (error) {
      console.error('Failed to delete rule set:', error)
      throw error
    }
  },

  // Simulation - with user identification and fallback handling
  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const userRequest = addUserIdToData(request)
    console.log('🔒 Simulating request for user:', getCurrentUserId())
    
    // Store the original rule set ID for reference
    const originalRuleSetId = request.rule_set_id
    let ruleSetModified = false
    
    // Verify rule set exists first
    try {
      // Clear cache but don't clear all rule sets - just refresh data
      console.log(`Verifying rule set ${request.rule_set_id} exists before simulation...`)
      const ruleSets = await this.getRuleSets()
      
      // Check if the requested rule set exists
      const ruleSetExists = ruleSets.some(rs => rs.id === request.rule_set_id)
      
      if (!ruleSetExists && ruleSets.length > 0) {
        // If requested rule set doesn't exist but others do, auto-select the first one
        const firstRuleSet = ruleSets[0]
        console.log(`⚠️ Requested rule set ${request.rule_set_id} not found. Auto-selecting ${firstRuleSet.id} instead.`)
        userRequest.rule_set_id = firstRuleSet.id
        ruleSetModified = true
      } else if (!ruleSetExists && ruleSets.length === 0) {
        // If no rule sets exist at all, try to create one
        console.log('⚠️ No rule sets found, creating one automatically...')
        try {
          const newRuleSetId = await this.ensureRuleSetExists()
          console.log(`✅ Created new rule set: ${newRuleSetId}`)
          userRequest.rule_set_id = newRuleSetId
          ruleSetModified = true
        } catch (createError) {
          console.error('Failed to create rule set:', createError)
          throw new Error('No valid rule sets available. Please create a rule set first.')
        }
      }
    } catch (verifyError) {
      console.error('Failed to verify rule set:', verifyError)
      // Continue with simulation attempt despite verification failure
    }
    
    try {
      // First try using the standard axios client approach
      try {
        const response = await apiClient.post('/simulate', userRequest)
        const result = response.data
        
        // Add user ID to result
        if (ruleSetModified) {
          // Add a note about rule set substitution
          const substitutionNote = `Note: Originally requested rule set (${originalRuleSetId}) was not found. Using rule set ${userRequest.rule_set_id} instead.`
          if (!result.evaluation_details) {
            result.evaluation_details = []
          }
          result.evaluation_details.unshift(substitutionNote)
        }
        
        return addUserIdToData(result)
      } catch (error: any) {
        // If it's a 404 (endpoint not found), try the fallback approach
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log('🔄 Simulate endpoint not found, trying fallback approach...')
          
          // Try a direct fetch to test different endpoint patterns
          const backendUrl = getBackendUrl()
          
          // Attempt with /api/simulate endpoint (some deployment environments add /api prefix)
          try {
            const fallbackResponse = await fetch(`${backendUrl}/api/simulate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-User-ID': getCurrentUserId(),
                'Accept': 'application/json'
              },
              body: JSON.stringify(userRequest)
            })
            
            if (fallbackResponse.ok) {
              console.log('✅ Fallback to /api/simulate successful')
              const result = await fallbackResponse.json()
              
              if (ruleSetModified) {
                // Add a note about rule set substitution
                const substitutionNote = `Note: Originally requested rule set (${originalRuleSetId}) was not found. Using rule set ${userRequest.rule_set_id} instead.`
                if (!result.evaluation_details) {
                  result.evaluation_details = []
                }
                result.evaluation_details.unshift(substitutionNote)
              }
              
              return addUserIdToData(result)
            }
          } catch (fallbackError) {
            console.warn('Fallback /api/simulate attempt failed:', fallbackError)
          }
          
          // If that fails, try evaluating a rule set directly as a last resort
          try {
            console.log('🔄 Attempting direct rule evaluation as fallback...')
            
            // Get a fresh list of rule sets but without clearing cache - just use current state
            const ruleSets = await this.getRuleSets()
            
            // Look for the rule set again or pick a valid one
            let ruleSet = ruleSets.find(rs => rs.id === userRequest.rule_set_id)
            let autoSelectedRuleSet = false
            
            if (!ruleSet && ruleSets.length > 0) {
              // If requested rule set still not found, use the first available one
              ruleSet = ruleSets[0]
              console.log(`Auto-selecting rule set: ${ruleSet.id}`)
              autoSelectedRuleSet = true
            }
            
            if (!ruleSet) {
              throw new Error(`No valid rule sets available. Please create a rule set first.`)
            }
            
            // Create a simplified simulation result
            // This is a fallback that doesn't provide full rule evaluation
            const simplifiedResult: SimulationResult = {
              decision: ruleSet.default_action === 'block' ? 'BLOCKED' : 'ALLOWED',
              matched_rule: 'default_action',
              reason: `Fallback evaluation using rule set "${ruleSet.name}" default action: ${ruleSet.default_action.toUpperCase()}`,
              evaluation_details: [
                'Note: This is a fallback evaluation due to simulation endpoint issues',
                `Using rule set: ${ruleSet.name} (${ruleSet.id})`,
                `Rule set default action: ${ruleSet.default_action}`
              ],
              userId: getCurrentUserId()
            }
            
            // Add rule set substitution note if needed
            if (ruleSetModified || autoSelectedRuleSet) {
              simplifiedResult.evaluation_details.unshift(
                `Note: Originally requested rule set (${originalRuleSetId}) was not found. Using rule set ${ruleSet.id} instead.`
              )
            }
            
            // Apply some basic rule evaluation logic for improved simulation
            if (ruleSet.ip_rules && ruleSet.ip_rules.type === 'block' && 
                ruleSet.ip_rules.cidrs.includes(userRequest.client_ip)) {
              simplifiedResult.decision = 'BLOCKED'
              simplifiedResult.matched_rule = 'ip_rules'
              simplifiedResult.reason = `IP ${userRequest.client_ip} is in blocked CIDR list`
              simplifiedResult.evaluation_details.push(`IP ${userRequest.client_ip} matched blocked CIDR`)
            }
            
            if (ruleSet.path_rules && ruleSet.path_rules.length > 0) {
              for (const pathRule of ruleSet.path_rules) {
                if (pathRule.condition === 'equals' && pathRule.path_pattern === userRequest.path) {
                  simplifiedResult.decision = 'BLOCKED'
                  simplifiedResult.matched_rule = 'path_rules'
                  simplifiedResult.reason = `Path ${userRequest.path} matches blocked path pattern`
                  simplifiedResult.evaluation_details.push(`Path ${userRequest.path} matched blocked path pattern`)
                  break
                }
              }
            }
            
            console.log('⚠️ Using simplified fallback evaluation:', simplifiedResult)
            
            // Log this evaluation
            try {
              const logEntry = {
                timestamp: new Date().toISOString(),
                rule_set_id: ruleSet.id,
                client_ip: userRequest.client_ip,
                result: simplifiedResult,
                userId: getCurrentUserId(),
                is_fallback: true
              }
              
              // Attempt to log the evaluation
              fetch(`${backendUrl}/logs`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-User-ID': getCurrentUserId()
                },
                body: JSON.stringify(logEntry)
              }).catch(e => console.warn('Failed to log evaluation:', e))
            } catch (logError) {
              console.warn('Failed to create log entry:', logError)
            }
            
            return simplifiedResult
          } catch (directError) {
            console.error('All fallback methods failed:', directError)
            throw directError // Throw the specific error from the fallback
          }
        } else {
          // For non-404 errors, just re-throw
          throw error
        }
      }
    } catch (error) {
      console.error('Failed to simulate request:', error)
      throw error
    }
  },

  // Evaluation logs
  async getEvaluationLogs(): Promise<EvaluationLog[]> {
    const cacheKey = getCacheKey('logs')
    const cached = getFromCache(cacheKey)
    if (cached) return cached
    
    try {
      const response = await apiClient.get('/logs')
      const logs = response.data
      
      setCache(cacheKey, logs)
      return logs
    } catch (error) {
      console.error('Failed to fetch evaluation logs:', error)
      throw error
    }
  },

  // Alias for getEvaluationLogs to maintain backward compatibility
  async getLogs(): Promise<EvaluationLog[]> {
    return this.getEvaluationLogs()
  },

  async clearEvaluationLogs(): Promise<{ status: string; message: string }> {
    try {
      const response = await apiClient.delete('/logs')
      clearUserCache() // Clear cache after mutation
      return response.data
    } catch (error) {
      console.error('Failed to clear evaluation logs:', error)
      throw error
    }
  },

  // Alias for clearEvaluationLogs to maintain backward compatibility
  async clearLogs(): Promise<{ status: string; message: string }> {
    return this.clearEvaluationLogs()
  },

  // Templates
  async getTemplates(): Promise<RuleTemplate[]> {
    const cacheKey = getCacheKey('templates')
    const cached = getFromCache(cacheKey)
    if (cached) return cached

    try {
      const response = await apiClient.get('/templates')
      const templates = response.data
      
      setCache(cacheKey, templates)
      return templates
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      throw error
    }
  },

  // Utility function to ensure a rule set exists
  async ensureRuleSetExists(): Promise<string> {
    try {
      // First check if any rule sets exist
      const ruleSets = await this.getRuleSets()
      
      if (ruleSets.length > 0) {
        // Return the ID of the first rule set - but never delete existing ones
        console.log('Using existing rule set:', ruleSets[0].id)
        return ruleSets[0].id
      }
      
      // No rule sets exist, create one from a template
      console.log('No rule sets found, creating one from template...')
      const templates = await this.getTemplates()
      
      if (templates.length === 0) {
        throw new Error('No templates available to create rule set')
      }
      
      // Use the first template
      const template = templates[0]
      const ruleSetName = `Auto-created Rule Set (${new Date().toLocaleTimeString()})`
      
      const result = await this.applyTemplate(template.id, ruleSetName)
      console.log('Created new rule set:', result)
      
      return result.rule_set_id
    } catch (error) {
      console.error('Failed to ensure rule set exists:', error)
      throw error
    }
  },

  async applyTemplate(templateId: string, ruleSetName: string): Promise<{ message: string; rule_set_id: string }> {
    try {
      console.log(`Applying template ${templateId} with name ${ruleSetName}`)
      
      const response = await fetch(`${getBackendUrl()}/templates/${templateId}/apply?rule_set_name=${encodeURIComponent(ruleSetName)}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API Error (${response.status}):`, errorText)
        throw new APIError(`Failed to apply template: ${response.statusText}`, response.status)
      }
      
      const result = await response.json()
      
      // Clear caches to force refresh
      clearUserCache()
      clearSessionData('rules')
      
      return result
    } catch (error) {
      console.error('Template application error:', error)
      throw error instanceof APIError 
        ? error 
        : new APIError(`Failed to apply template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  // Scenarios
  async getScenarios(): Promise<ExploitScenario[]> {
    const cacheKey = getCacheKey('scenarios')
      const cached = getFromCache(cacheKey)
    if (cached) return cached

    try {
      const response = await apiClient.get('/scenarios')
      const scenarios = response.data
      
      setCache(cacheKey, scenarios)
      return scenarios
    } catch (error) {
      console.error('Failed to fetch scenarios:', error)
      throw error
    }
  },

  async testScenario(scenarioId: string, ruleSetId: string): Promise<ScenarioTestResult> {
    try {
      console.log(`Testing scenario ${scenarioId} with rule set ${ruleSetId}`)
      
      // First verify rule set exists with fresh data
      console.log('🔍 Verifying rule set exists before testing...')
      
      // Clear cache to ensure fresh data
      clearUserCache()
      
      const ruleSets = await this.getRuleSets()
      console.log('Available rule sets before test:', ruleSets.map(rs => rs.id))
      const ruleSetExists = ruleSets.some(rs => rs.id === ruleSetId)
      
      if (!ruleSetExists) {
        // Clear cache and try one more time
        console.log('🔄 Rule set not found in cache, clearing cache and retrying...')
        clearUserCache()
        await new Promise(resolve => setTimeout(resolve, 300)) // Small delay
        const freshRuleSets = await this.getRuleSets()
        console.log('Available rule sets after refresh:', freshRuleSets.map(rs => rs.id))
        const stillExists = freshRuleSets.some(rs => rs.id === ruleSetId)
        
        if (!stillExists) {
          throw new APIError(`Rule set "${ruleSetId}" not found. Please refresh the page and try again.`, 404)
        }
      }
      
      console.log(`Making test request to ${getBackendUrl()}/scenarios/${scenarioId}/test with rule set ${ruleSetId}`)
      const response = await fetch(`${getBackendUrl()}/scenarios/${scenarioId}/test?rule_set_id=${encodeURIComponent(ruleSetId)}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API Error (${response.status}):`, errorText)
        
        if (response.status === 404 && errorText.includes('Rule set not found')) {
          // If rule set not found, try a special technique:
          // 1. Create a rule set from template
          // 2. Use that rule set ID instead
          if (errorText.includes('Rule set not found')) {
            try {
              console.log('🚨 Rule set not found in backend despite verification. Attempting recovery...')
              // Try one more special recovery strategy: get the most recent rule set
              const latestRuleSets = await this.getRuleSets()
              if (latestRuleSets.length > 0) {
                const latestRuleSet = latestRuleSets[0]
                console.log(`Trying alternate rule set: ${latestRuleSet.id}`)
                
                // Make second attempt with different rule set
                const recoveryResponse = await fetch(`${getBackendUrl()}/scenarios/${scenarioId}/test?rule_set_id=${encodeURIComponent(latestRuleSet.id)}`, {
                  method: 'POST',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-User-ID': getCurrentUserId()
                  }
                })
                
                if (recoveryResponse.ok) {
                  console.log('✅ Recovery successful using alternate rule set')
                  return await recoveryResponse.json()
                }
              }
            } catch (recoveryError) {
              console.error('Recovery strategy failed:', recoveryError)
            }
          }
          
          throw new APIError(`Rule set not found. Please refresh the page and try again.`, 404)
        }
        
        throw new APIError(`API Error (${response.status}): ${response.statusText}`, response.status)
      }
      
      const result = await response.json()
      return result
    } catch (error) {
      console.error('Test scenario error:', error)
      throw error instanceof APIError 
        ? error 
        : new APIError(`Test error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Utility functions
export const validateIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip)
}

export const validateCIDR = (cidr: string): boolean => {
  const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/
  return cidrRegex.test(cidr)
}

export const generateJWTToken = (claims: Record<string, any> = {}): string => {
  // Simple JWT generator for testing purposes
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    iss: 'test-issuer',
    aud: 'test-audience', 
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
    ...claims
  }
  
  const base64Header = btoa(JSON.stringify(header))
  const base64Payload = btoa(JSON.stringify(payload))
  
  return `${base64Header}.${base64Payload}.fake-signature`
} 