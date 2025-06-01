// User management for client-side data isolation
// Each browser session gets a unique user ID to isolate their data

export interface User {
  id: string
  sessionId: string
  createdAt: string
}

const USER_STORAGE_KEY = 'zeropass_user'
const SESSION_STORAGE_KEY = 'zeropass_session'

// Check if we're in a browser environment
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

// Generate a unique user ID
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Generate a unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Get or create current user
export function getCurrentUser(): User {
  // Return a default user during SSR
  if (!isBrowser()) {
    return {
      id: 'ssr_user',
      sessionId: 'ssr_session',
      createdAt: new Date().toISOString()
    }
  }

  // Check if we have a user in localStorage
  const storedUser = localStorage.getItem(USER_STORAGE_KEY)
  const sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY)
  
  if (storedUser && sessionId) {
    try {
      const user = JSON.parse(storedUser)
      // Verify session is still valid
      if (user.sessionId === sessionId) {
        return user
      }
    } catch (error) {
      console.warn('Invalid stored user data, creating new user')
    }
  }
  
  // Create new user
  const newUser: User = {
    id: generateUserId(),
    sessionId: generateSessionId(),
    createdAt: new Date().toISOString()
  }
  
  // Store user data
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser))
  sessionStorage.setItem(SESSION_STORAGE_KEY, newUser.sessionId)
  
  return newUser
}

// Get current user ID
export function getCurrentUserId(): string {
  return getCurrentUser().id
}

// Clear user session (for logout or reset)
export function clearUserSession(): void {
  if (!isBrowser()) return
  
  localStorage.removeItem(USER_STORAGE_KEY)
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
}

// Check if data belongs to current user
export function isOwnedByCurrentUser(itemUserId: string): boolean {
  return itemUserId === getCurrentUserId()
}

// Add user ID to data
export function addUserIdToData<T>(data: T): T & { userId: string } {
  return {
    ...data,
    userId: getCurrentUserId()
  }
}

// Filter data by current user
export function filterByCurrentUser<T extends { userId?: string }>(items: T[]): T[] {
  if (!isBrowser()) {
    // During SSR, return empty array to prevent hydration mismatches
    return []
  }
  
  const currentUserId = getCurrentUserId()
  return items.filter(item => item.userId === currentUserId)
}

// Get user-specific storage key
export function getUserStorageKey(key: string): string {
  return `${key}_${getCurrentUserId()}`
}

// Cache management
const CACHE_KEYS = [
  'zeropass_ruleSets',
  'zeropass_logs',
  'zeropass_simulationHistory'
]

// Clear all caches
export function clearAllCaches(): void {
  if (!isBrowser()) return
  
  CACHE_KEYS.forEach(key => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
  
  // Clear any user-specific caches
  const currentUserId = getCurrentUserId()
  CACHE_KEYS.forEach(key => {
    localStorage.removeItem(`${key}_${currentUserId}`)
    sessionStorage.removeItem(`${key}_${currentUserId}`)
  })
}

// Initialize user on app start
export function initializeUser(): User {
  if (!isBrowser()) {
    return {
      id: 'ssr_user',
      sessionId: 'ssr_session',
      createdAt: new Date().toISOString()
    }
  }
  
  // Clear caches on new session
  if (!sessionStorage.getItem(SESSION_STORAGE_KEY)) {
    clearAllCaches()
  }
  
  return getCurrentUser()
} 