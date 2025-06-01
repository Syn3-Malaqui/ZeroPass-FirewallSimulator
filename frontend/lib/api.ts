import axios from 'axios'
import type { FirewallRuleSet, SimulationRequest, SimulationResult, EvaluationLog } from './store'

// API client configuration - force HTTPS for production
const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: Check if we're on localhost or production
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (isLocalhost) {
      return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    }
  }
  // Always use production backend URL for deployed version
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeropass-backend.onrender.com'
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
  timeout: 15000, // Increased timeout for deployment
  withCredentials: false, // Disable credentials for CORS
})

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
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
      throw new Error('Network Error: Unable to connect to the server. Please check if the backend is running and CORS is configured correctly.')
    } else {
      // Something else happened
      throw new Error(`Request Error: ${error.message}`)
    }
  }
)

export const api = {
  // Health check
  async health() {
    const response = await apiClient.get('/health')
    return response.data
  },

  // Rule Set Management
  async getRuleSets(): Promise<FirewallRuleSet[]> {
    const response = await apiClient.get('/rules')
    return response.data
  },

  async getRuleSet(id: string): Promise<FirewallRuleSet> {
    const response = await apiClient.get(`/rules/${id}`)
    return response.data
  },

  async createRuleSet(ruleSet: FirewallRuleSet): Promise<{ status: string; rule_set_id: string }> {
    const response = await apiClient.post('/rules', ruleSet)
    return response.data
  },

  async updateRuleSet(ruleSet: FirewallRuleSet): Promise<{ status: string; rule_set_id: string }> {
    const response = await apiClient.post('/rules', ruleSet)
    return response.data
  },

  async deleteRuleSet(id: string): Promise<{ status: string; message: string }> {
    const response = await apiClient.delete(`/rules/${id}`)
    return response.data
  },

  // Simulation
  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const response = await apiClient.post('/simulate', request)
    return response.data
  },

  // Logs
  async getLogs(limit = 100): Promise<EvaluationLog[]> {
    const response = await apiClient.get(`/logs?limit=${limit}`)
    return response.data
  },

  async clearLogs(): Promise<{ status: string; message: string }> {
    const response = await apiClient.delete('/logs')
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