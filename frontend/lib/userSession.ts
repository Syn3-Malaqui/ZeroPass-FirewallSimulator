/**
 * User Session Management for ZeroPass
 * 
 * Provides user isolation by generating unique session IDs
 * Each user gets their own private workspace for rules and logs
 */

// Generate a unique session ID
const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `zp_${timestamp}_${randomPart}`
}

// Generate a human-readable session name
const generateSessionName = (): string => {
  const adjectives = [
    'Swift', 'Secure', 'Silent', 'Sharp', 'Smart', 'Strong', 'Steady', 'Solid',
    'Quick', 'Quiet', 'Quantum', 'Crystal', 'Cyber', 'Digital', 'Dynamic', 'Elite',
    'Fast', 'Fire', 'Flex', 'Ghost', 'Guard', 'Iron', 'Laser', 'Logic',
    'Mega', 'Meta', 'Nano', 'Neo', 'Nova', 'Omega', 'Phoenix', 'Prime',
    'Rapid', 'Royal', 'Sonic', 'Steel', 'Storm', 'Super', 'Titan', 'Ultra'
  ]
  
  const nouns = [
    'Falcon', 'Eagle', 'Hawk', 'Wolf', 'Lion', 'Tiger', 'Panther', 'Jaguar',
    'Shield', 'Guard', 'Sentinel', 'Warden', 'Keeper', 'Defender', 'Protector',
    'Scanner', 'Monitor', 'Tracker', 'Hunter', 'Seeker', 'Explorer', 'Scout',
    'Cipher', 'Vector', 'Matrix', 'Binary', 'Protocol', 'Gateway', 'Portal',
    'Nexus', 'Core', 'Engine', 'System', 'Network', 'Circuit', 'Module'
  ]
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const number = Math.floor(Math.random() * 999) + 1
  
  return `${adjective} ${noun} ${number}`
}

export interface UserSession {
  id: string
  name: string
  createdAt: string
  lastActive: string
}

class UserSessionManager {
  private readonly SESSION_KEY = 'zeropass_user_session'
  private readonly CACHE_KEY = 'zeropass_cache_timestamp'
  
  // Get or create user session
  getSession(): UserSession {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY)
      if (stored) {
        const session: UserSession = JSON.parse(stored)
        // Update last active timestamp
        session.lastActive = new Date().toISOString()
        this.saveSession(session)
        return session
      }
    } catch (error) {
      console.warn('Failed to load stored session:', error)
    }
    
    // Create new session
    return this.createNewSession()
  }
  
  // Create a new user session
  createNewSession(): UserSession {
    const session: UserSession = {
      id: generateSessionId(),
      name: generateSessionName(),
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    }
    
    this.saveSession(session)
    this.clearCache() // Clear cache when creating new session
    return session
  }
  
  // Save session to localStorage
  private saveSession(session: UserSession): void {
    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
    } catch (error) {
      console.warn('Failed to save session:', error)
    }
  }
  
  // Update session name
  updateSessionName(name: string): void {
    const session = this.getSession()
    session.name = name
    session.lastActive = new Date().toISOString()
    this.saveSession(session)
  }
  
  // Clear current session and create new one
  resetSession(): UserSession {
    try {
      localStorage.removeItem(this.SESSION_KEY)
    } catch (error) {
      console.warn('Failed to clear session:', error)
    }
    this.clearCache()
    return this.createNewSession()
  }
  
  // Cache management
  clearCache(): void {
    try {
      // Clear any cached data
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('zeropass_cache_') || key.startsWith('zp_cache_')) {
          localStorage.removeItem(key)
        }
      })
      
      // Set cache clear timestamp
      localStorage.setItem(this.CACHE_KEY, Date.now().toString())
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }
  
  // Check if cache should be cleared based on page refresh
  shouldClearCache(): boolean {
    try {
      const lastClear = localStorage.getItem(this.CACHE_KEY)
      if (!lastClear) return true
      
      // Clear cache if last clear was more than 5 minutes ago
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
      return parseInt(lastClear) < fiveMinutesAgo
    } catch (error) {
      return true
    }
  }
  
  // Get session info for display
  getSessionInfo(): { id: string; name: string; shortId: string } {
    const session = this.getSession()
    const shortId = session.id.split('_').pop()?.substring(0, 8) || 'unknown'
    
    return {
      id: session.id,
      name: session.name,
      shortId: shortId
    }
  }
}

// Export singleton instance
export const userSession = new UserSessionManager()

// React hook for user session
export const useUserSession = () => {
  const session = userSession.getSession()
  
  return {
    session,
    sessionInfo: userSession.getSessionInfo(),
    resetSession: () => userSession.resetSession(),
    updateName: (name: string) => userSession.updateSessionName(name),
    clearCache: () => userSession.clearCache()
  }
} 