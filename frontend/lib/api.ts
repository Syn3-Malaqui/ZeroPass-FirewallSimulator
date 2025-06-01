import axios from 'axios'
import type { FirewallRuleSet, SimulationRequest, SimulationResult, EvaluationLog } from './store'
import { getCurrentUserId, addUserIdToData, filterByCurrentUser } from './user'

// API client configuration - ensure consistent backend URL
const getBackendUrl = () => {
  // Always use the production backend URL for now since it's working
  const backendUrl = 'https://zeropass-backend.onrender.com'
  
  // For local development, you can uncomment this to use localhost:
  // if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  //   return 'http://localhost:8000'
  // }
  
  return backendUrl
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
  const cache = getUserCache()
  const cached = cache.get(cacheKey)
  
  if (cached && cached.timestamp && Date.now() - cached.timestamp < 30000) { // 30 second cache
    return cached.data
  }
  
  return null
}

function setCache(cacheKey: string, data: any): void {
  const cache = getUserCache()
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  })
}

function clearUserCache(): void {
  const userId = getCurrentUserId()
  userCache.delete(userId)
}

// Clear cache on page refresh
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    clearUserCache()
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

  // Rule Set Management - with user filtering
  async getRuleSets(): Promise<FirewallRuleSet[]> {
    const cacheKey = getCacheKey('ruleSets')
    const cached = getFromCache(cacheKey)
    
    if (cached) {
      console.log('📦 Using cached rule sets')
      return cached
    }
    
    const response = await apiClient.get('/rules')
    const allRuleSets = response.data
    
    // Filter by current user and add user ID to new rules
    const userRuleSets = allRuleSets.map((rs: FirewallRuleSet) => {
      if (!rs.userId) {
        // Legacy rule set, assign to current user
        return addUserIdToData(rs)
      }
      return rs
    }).filter((rs: FirewallRuleSet) => rs.userId === getCurrentUserId())
    
    setCache(cacheKey, userRuleSets)
    return userRuleSets
  },

  async getRuleSet(id: string): Promise<FirewallRuleSet> {
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
  },

  async createRuleSet(ruleSet: FirewallRuleSet): Promise<{ status: string; rule_set_id: string }> {
    const userRuleSet = addUserIdToData(ruleSet)
    const response = await apiClient.post('/rules', userRuleSet)
    clearUserCache() // Clear cache after mutation
    return response.data
  },

  async updateRuleSet(ruleSet: FirewallRuleSet): Promise<{ status: string; rule_set_id: string }> {
    const userRuleSet = addUserIdToData(ruleSet)
    
    // Verify ownership before update
    if (ruleSet.userId && ruleSet.userId !== getCurrentUserId()) {
      throw new Error('Access denied: Cannot update another user\'s rule set')
    }
    
    const response = await apiClient.post('/rules', userRuleSet)
    clearUserCache() // Clear cache after mutation
    return response.data
  },

  async deleteRuleSet(id: string): Promise<{ status: string; message: string }> {
    // Note: We can't verify ownership on delete without fetching first
    // The backend should handle this, but we clear cache to be safe
    const response = await apiClient.delete(`/rules/${id}`)
    clearUserCache() // Clear cache after mutation
    return response.data
  },

  // Simulation - with user identification
  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const userRequest = addUserIdToData(request)
    const response = await apiClient.post('/simulate', userRequest)
    const result = response.data
    
    // Add user ID to result
    return addUserIdToData(result)
  },

  // Logs - with user filtering
  async getLogs(limit = 100): Promise<EvaluationLog[]> {
    const cacheKey = getCacheKey('logs', { limit })
    const cached = getFromCache(cacheKey)
    
    if (cached) {
      console.log('📦 Using cached logs')
      return cached
    }
    
    const response = await apiClient.get(`/logs?limit=${limit}`)
    const allLogs = response.data
    
    // Filter by current user and add user ID to new logs
    const userLogs = allLogs.map((log: EvaluationLog) => {
      if (!log.userId) {
        // Legacy log, assign to current user if it matches current session
        return addUserIdToData(log)
      }
      return log
    }).filter((log: EvaluationLog) => log.userId === getCurrentUserId())
    
    setCache(cacheKey, userLogs)
    return userLogs
  },

  async clearLogs(): Promise<{ status: string; message: string }> {
    // Note: This will clear all logs on the backend
    // In a real implementation, this should be user-specific
    const response = await apiClient.delete('/logs')
    clearUserCache() // Clear cache after mutation
    return response.data
  },
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