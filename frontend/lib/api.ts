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

  // Health check
  async health() {
    try {
      const response = await fetch(`${getBackendUrl()}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-User-ID': getCurrentUserId()
        }
      })

      if (!response.ok) {
        throw new APIError(`Health check failed: ${response.statusText}`, response.status)
      }

      return await response.json()
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

  // Simulation - with user identification
  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const userRequest = addUserIdToData(request)
    console.log('🔒 Simulating request for user:', getCurrentUserId())
    
    try {
      const response = await apiClient.post('/simulate', userRequest)
      const result = response.data
      
      // Add user ID to result
      return addUserIdToData(result)
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
      const ruleSets = await this.getRuleSets()
      const ruleSetExists = ruleSets.some(rs => rs.id === ruleSetId)
      
      if (!ruleSetExists) {
        // Clear cache and try one more time
        console.log('🔄 Rule set not found in cache, clearing cache and retrying...')
        clearUserCache()
        const freshRuleSets = await this.getRuleSets()
        const stillExists = freshRuleSets.some(rs => rs.id === ruleSetId)
        
        if (!stillExists) {
          throw new APIError(`Rule set "${ruleSetId}" not found. Please refresh the page and try again.`, 404)
        }
      }
      
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