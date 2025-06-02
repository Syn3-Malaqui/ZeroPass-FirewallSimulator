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

// Generate a unique user ID with more stability
function generateUserId(): string {
  // Use a more stable approach for user ID generation
  const timestamp = Date.now()
  const randomPart = Math.random().toString(36).substr(2, 9)
  return `user_${timestamp}_${randomPart}`
}

// Generate a unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Global user instance to prevent multiple user creations
let currentUserInstance: User | null = null

// Store previous user IDs to help recover data
const PREVIOUS_USERS_KEY = 'zeropass_previous_users'

// Get previous user IDs with ability to recover data
export function getPreviousUserIds(): string[] {
  if (!isBrowser()) return []
  
  try {
    const storedUsers = localStorage.getItem(PREVIOUS_USERS_KEY)
    if (storedUsers) {
      return JSON.parse(storedUsers)
    }
  } catch (error) {
    console.warn('Error reading previous users:', error)
  }
  
  return []
}

// Add current user to previous users list
function trackCurrentUser(userId: string): void {
  if (!isBrowser()) return
  
  try {
    const previousUsers = getPreviousUserIds()
    
    // Only add if not already in the list
    if (!previousUsers.includes(userId)) {
      const updatedUsers = [userId, ...previousUsers].slice(0, 10) // Keep last 10
      localStorage.setItem(PREVIOUS_USERS_KEY, JSON.stringify(updatedUsers))
    }
  } catch (error) {
    console.warn('Error tracking user:', error)
  }
}

// Get or create current user with better stability
export function getCurrentUser(): User {
  // Return cached instance if available (prevents regeneration)
  if (currentUserInstance && isBrowser()) {
    return currentUserInstance
  }

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
  
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser)
      
      // If we have both stored user and session ID, and they match
      if (sessionId && user.sessionId === sessionId) {
        // Track this user ID for recovery purposes
        trackCurrentUser(user.id)
        currentUserInstance = user
        return user
      }
      
      // If we have a stored user but no matching session, reuse the user but create new session
      if (user.id) {
        const newSessionId = generateSessionId()
        const updatedUser: User = {
          ...user,
          sessionId: newSessionId
        }
        
        // Store updated user data
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser))
        sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId)
        
        // Track this user ID for recovery purposes
        trackCurrentUser(user.id)
        currentUserInstance = updatedUser
        return updatedUser
      }
    } catch (error) {
      console.warn('Invalid stored user data, creating new user')
    }
  }
  
  // Create new user only if absolutely necessary
  const newUser: User = {
    id: generateUserId(),
    sessionId: generateSessionId(),
    createdAt: new Date().toISOString()
  }
  
  // Store user data
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser))
  sessionStorage.setItem(SESSION_STORAGE_KEY, newUser.sessionId)
  
  // Track this user ID for recovery purposes
  trackCurrentUser(newUser.id)
  currentUserInstance = newUser
  console.log('✅ Created new user session:', newUser.id)
  return newUser
}

// Get current user ID with caching
export function getCurrentUserId(): string {
  return getCurrentUser().id
}

// Clear user session (for logout or reset)
export function clearUserSession(): void {
  if (!isBrowser()) return
  
  localStorage.removeItem(USER_STORAGE_KEY)
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
  currentUserInstance = null // Clear cached instance
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

// Initialize user on app start with better stability
export function initializeUser(): User {
  if (!isBrowser()) {
    return {
      id: 'ssr_user',
      sessionId: 'ssr_session',
      createdAt: new Date().toISOString()
    }
  }
  
  // Don't clear caches on every initialization - only if truly new session
  const existingUser = localStorage.getItem(USER_STORAGE_KEY)
  const existingSession = sessionStorage.getItem(SESSION_STORAGE_KEY)
  
  if (!existingUser && !existingSession) {
    // Only clear caches if this is truly a new session
    clearAllCaches()
  }
  
  return getCurrentUser()
}

// Function to recover rule sets from previous sessions
export async function recoverRuleSetsFromPreviousSessions(apiClient: any): Promise<{success: boolean, message: string, recoveredCount: number}> {
  if (!isBrowser()) {
    return { success: false, message: 'Cannot recover data during server-side rendering', recoveredCount: 0 }
  }
  
  try {
    const previousUserIds = getPreviousUserIds().filter(id => id !== getCurrentUserId())
    
    if (previousUserIds.length === 0) {
      return { success: false, message: 'No previous sessions found to recover from', recoveredCount: 0 }
    }
    
    console.log(`Attempting to recover rule sets from ${previousUserIds.length} previous sessions`)
    
    let totalRecovered = 0
    const currentUserId = getCurrentUserId()
    
    // Try each previous user ID
    for (const userId of previousUserIds) {
      try {
        console.log(`Checking for rule sets from user ID: ${userId}`)
        
        // Make request using previous user ID
        const response = await fetch(`${apiClient.getBackendUrl()}/rules`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-User-ID': userId,
            'Cache-Control': 'no-cache'
          }
        })
        
        if (!response.ok) continue
        
        const ruleSets = await response.json()
        
        if (ruleSets.length === 0) continue
        
        console.log(`Found ${ruleSets.length} rule sets from previous session ${userId}`)
        
        // For each rule set, clone it to the current user
        for (const ruleSet of ruleSets) {
          // Skip rule sets that are auto-created
          if (ruleSet.name.includes('Auto-created Rule Set')) continue
          
          // Create a copy for the current user
          const newRuleSet = {
            ...ruleSet,
            id: undefined, // Let the server generate a new ID
            name: `${ruleSet.name} (Recovered)`,
            userId: currentUserId
          }
          
          const createResponse = await fetch(`${apiClient.getBackendUrl()}/rules`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-User-ID': currentUserId
            },
            body: JSON.stringify(newRuleSet)
          })
          
          if (createResponse.ok) {
            totalRecovered++
          }
        }
      } catch (error) {
        console.warn(`Failed to recover from user ${userId}:`, error)
        // Continue to the next user ID
      }
    }
    
    if (totalRecovered > 0) {
      return { 
        success: true, 
        message: `Successfully recovered ${totalRecovered} rule sets from previous sessions`, 
        recoveredCount: totalRecovered 
      }
    } else {
      return { 
        success: false, 
        message: 'No rule sets could be recovered from previous sessions', 
        recoveredCount: 0 
      }
    }
  } catch (error) {
    console.error('Recovery error:', error)
    return { 
      success: false, 
      message: `Recovery error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      recoveredCount: 0 
    }
  }
} 