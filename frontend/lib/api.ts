import axios from 'axios'
import type { FirewallRuleSet, SimulationRequest, SimulationResult, EvaluationLog, RuleTemplate, ExploitScenario, ScenarioTestResult } from './store'
import { getCurrentUserId, addUserIdToData, filterByCurrentUser } from './user'

// API client configuration - ensure consistent backend URL
const getBackendUrl = () => {
  // First check for runtime environment variable
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return 'https://zeropass-backend.onrender.com';
  }

  // Then check for Next.js environment variable
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }

  // Default to Render backend in production
  if (process.env.NODE_ENV === 'production') {
    return 'https://zeropass-backend.onrender.com';
  }

  // Local development fallback
  return 'http://localhost:8000';
}

const API_BASE_URL = getBackendUrl()

// Debug logging
console.log('🌐 API Configuration:')
console.log('NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL)
console.log('API_BASE_URL:', API_BASE_URL)
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('Window location:', typeof window !== 'undefined' ? window.location.href : 'SSR')

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 20000, // Increased timeout for Render cold starts
  withCredentials: false, // Disable credentials for CORS
})

// Request interceptor for logging and adding user identification
apiClient.interceptors.request.use(
  (config) => {
    // Add user identification to headers
    const userId = getCurrentUserId()
    if (userId) {
      config.headers['X-User-ID'] = userId
    }
    
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
    console.log(`👤 User ID: ${userId}`)
    return config
  },
  (error) => {
    console.error('❌ API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error('❌ API Response Error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    })
    
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.detail || error.response.data?.message || error.message
      throw new Error(`API Error (${error.response.status}): ${message}`)
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received. Network or CORS issue likely.')
      console.error('Request details:', error.request)
      
      // Check if it's a timeout
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout: The server took too long to respond. This may be due to a cold start on Render.')
      }
      
      throw new Error('Network Error: Unable to connect to the server. The backend may be starting up (cold start).')
    } else {
      // Something else happened
      throw new Error(`Request Error: ${error.message}`)
    }
  }
)

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
    
    // Check if data is fresh (30 seconds)
    if (Date.now() - parsed.timestamp > 30000) {
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

// Client-side cache for user-isolated data
const userCache = new Map<string, Map<string, any>>()

function getUserCache() {
  const userId = getCurrentUserId()
  if (!userCache.has(userId)) {
    userCache.set(userId, new Map())
  }
  return userCache.get(userId)!
}

function getCacheKey(endpoint: string, params?: any): string {
  return `${endpoint}_${JSON.stringify(params || {})}`
}

function getFromCache(cacheKey: string): any | null {
  // First try session storage (more persistent)
  const sessionData = getSessionData(cacheKey)
  if (sessionData) {
    return sessionData
  }
  
  // Then try memory cache
  const cache = getUserCache()
  const cached = cache.get(cacheKey)
  
  if (cached && cached.timestamp && Date.now() - cached.timestamp < 30000) { // 30 second cache
    return cached.data
  }
  
  return null
}

function setCache(cacheKey: string, data: any): void {
  // Store in both session storage and memory cache
  setSessionData(cacheKey, data)
  
  const cache = getUserCache()
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  })
}

function clearUserCache(): void {
  const userId = getCurrentUserId()
  userCache.delete(userId)
  clearSessionData() // Clear all session data for this user
}

// Clear cache on page refresh
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    clearUserCache()
  })
}

// Aggressive filtering function to ensure no data leaks
function aggressiveFilter<T extends { userId?: string }>(items: T[]): T[] {
  const currentUserId = getCurrentUserId()
  
  return items.filter(item => {
    // If item has no userId, it might be legacy data - assign it to current user
    if (!item.userId) {
      console.warn('Found item without userId, assigning to current user:', item)
      item.userId = currentUserId
      return true
    }
    
    // Only return items that belong to current user
    return item.userId === currentUserId
  })
}

export const api = {
  // Clear user cache manually
  clearCache: () => {
    clearUserCache()
  },

  // Health check
  async health() {
    const response = await apiClient.get('/health')
    return response.data
  },

  // Rule Set Management - with aggressive user filtering
  async getRuleSets(): Promise<FirewallRuleSet[]> {
    const cacheKey = getCacheKey('ruleSets')
    const cached = getFromCache(cacheKey)
    
    if (cached) {
      console.log('📦 Using cached rule sets')
      return aggressiveFilter(cached)
    }
    
    try {
      const response = await apiClient.get('/rules')
      const allRuleSets = response.data || []
      
      console.log(`📊 Backend returned ${allRuleSets.length} rule sets`)
      
      // Aggressively filter and assign user IDs
      const userRuleSets = allRuleSets.map((rs: FirewallRuleSet) => {
        if (!rs.userId) {
          // Legacy rule set, assign to current user
          return addUserIdToData(rs)
        }
        return rs
      }).filter((rs: FirewallRuleSet) => rs.userId === getCurrentUserId())
      
      console.log(`🔒 Filtered to ${userRuleSets.length} user-specific rule sets`)
      
      setCache(cacheKey, userRuleSets)
      return userRuleSets
    } catch (error) {
      console.error('Failed to fetch rule sets:', error)
      // Return empty array on error to prevent showing other users' data
      return []
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

  // Logs - with aggressive user filtering
  async getLogs(limit = 100): Promise<EvaluationLog[]> {
    const cacheKey = getCacheKey('logs', { limit })
    const cached = getFromCache(cacheKey)
    
    if (cached) {
      console.log('📦 Using cached logs')
      return aggressiveFilter(cached)
    }
    
    try {
      const response = await apiClient.get(`/logs?limit=${limit}`)
      const allLogs = response.data || []
      
      console.log(`📊 Backend returned ${allLogs.length} logs`)
      
      // Aggressively filter and assign user IDs
      const userLogs = allLogs.map((log: EvaluationLog) => {
        if (!log.userId) {
          // Legacy log, assign to current user only if it's very recent (last 10 minutes)
          const logTime = new Date(log.timestamp).getTime()
          const now = Date.now()
          if (now - logTime < 10 * 60 * 1000) { // 10 minutes
            return addUserIdToData(log)
          }
          // Otherwise, don't assign it to any user (filter it out)
          return null
        }
        return log
      }).filter((log: EvaluationLog | null): log is EvaluationLog => 
        log !== null && log.userId === getCurrentUserId()
      )
      
      console.log(`🔒 Filtered to ${userLogs.length} user-specific logs`)
      
      setCache(cacheKey, userLogs)
      return userLogs
    } catch (error) {
      console.error('Failed to fetch logs:', error)
      // Return empty array on error to prevent showing other users' data
      return []
    }
  },

  async clearLogs(): Promise<{ status: string; message: string }> {
    console.log('🔒 Clearing logs for user:', getCurrentUserId())
    
    try {
      // Note: This will clear all logs on the backend
      // In a real implementation, this should be user-specific
      const response = await apiClient.delete('/logs')
      clearUserCache() // Clear cache after mutation
      return response.data
    } catch (error) {
      console.error('Failed to clear logs:', error)
      throw error
    }
  },

  // Template Management
  async getTemplates(category?: string): Promise<RuleTemplate[]> {
    try {
      const cacheKey = getCacheKey('templates', { category })
      const cached = getFromCache(cacheKey)
      if (cached) {
        console.log('📋 Using cached templates data')
        return cached
      }

      console.log('🔍 Fetching templates from API...')
      const params = category ? { category } : {}
      const response = await apiClient.get('/templates', { params })
      
      setCache(cacheKey, response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching templates:', error)
      throw error
    }
  },

  async getTemplate(id: string): Promise<RuleTemplate> {
    try {
      const cacheKey = getCacheKey('template', { id })
      const cached = getFromCache(cacheKey)
      if (cached) {
        console.log(`📋 Using cached template data for ${id}`)
        return cached
      }

      console.log(`🔍 Fetching template ${id} from API...`)
      const response = await apiClient.get(`/templates/${id}`)
      
      setCache(cacheKey, response.data)
      return response.data
    } catch (error) {
      console.error(`❌ Error fetching template ${id}:`, error)
      throw error
    }
  },

  async applyTemplate(templateId: string, ruleSetName: string): Promise<{ message: string; rule_set_id: string }> {
    try {
      console.log(`🔧 Applying template ${templateId} with name "${ruleSetName}"...`)
      const response = await apiClient.post(`/templates/${templateId}/apply`, null, {
        params: { rule_set_name: ruleSetName }
      })
      
      // Clear caches to force refresh
      clearUserCache()
      clearSessionData('rules')
      
      return response.data
    } catch (error) {
      console.error(`❌ Error applying template ${templateId}:`, error)
      throw error
    }
  },

  // Exploit Scenarios
  async getScenarios(category?: string): Promise<ExploitScenario[]> {
    try {
      const cacheKey = getCacheKey('scenarios', { category })
      const cached = getFromCache(cacheKey)
      if (cached) {
        console.log('🎯 Using cached scenarios data')
        return cached
      }

      console.log('🔍 Fetching scenarios from API...')
      const params = category ? { category } : {}
      const response = await apiClient.get('/scenarios', { params })
      
      setCache(cacheKey, response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching scenarios:', error)
      throw error
    }
  },

  async getScenario(id: string): Promise<ExploitScenario> {
    try {
      const cacheKey = getCacheKey('scenario', { id })
      const cached = getFromCache(cacheKey)
      if (cached) {
        console.log(`🎯 Using cached scenario data for ${id}`)
        return cached
      }

      console.log(`🔍 Fetching scenario ${id} from API...`)
      const response = await apiClient.get(`/scenarios/${id}`)
      
      setCache(cacheKey, response.data)
      return response.data
    } catch (error) {
      console.error(`❌ Error fetching scenario ${id}:`, error)
      throw error
    }
  },

  async testScenario(scenarioId: string, ruleSetId: string): Promise<ScenarioTestResult> {
    try {
      console.log(`🧪 Testing scenario ${scenarioId} against rule set ${ruleSetId}...`)
      const response = await apiClient.post(`/scenarios/${scenarioId}/test`, null, {
        params: { rule_set_id: ruleSetId }
      })
      
      return response.data
    } catch (error) {
      console.error(`❌ Error testing scenario ${scenarioId}:`, error)
      throw error
    }
  }
}

// Utility functions for validation
export const validateCIDR = (cidr: string): boolean => {
  const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[12][0-9]|3[0-2])$/
  return cidrRegex.test(cidr)
}

export const validateIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip)
}

export const validateJWT = (token: string): boolean => {
  try {
    const parts = token.split('.')
    return parts.length === 3
  } catch {
    return false
  }
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

export const parseJWT = (token: string): Record<string, any> | null => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch {
    return null
  }
}

// Error handling utilities
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export const handleAPIError = (error: any): string => {
  if (error instanceof APIError) {
    return error.message
  }
  
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.detail) {
      return error.response.data.detail
    }
    if (error.response?.data?.message) {
      return error.response.data.message
    }
    return error.message
  }
  
  return error.message || 'An unexpected error occurred'
} 