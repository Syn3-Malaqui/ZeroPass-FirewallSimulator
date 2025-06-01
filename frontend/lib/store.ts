import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { userSession } from './userSession'

export interface IPRule {
  type: 'allow' | 'block'
  cidrs: string[]
}

export interface JWTRule {
  enabled: boolean
  required_claims?: Record<string, any>
  issuer?: string
  audience?: string
}

export interface OAuth2Rule {
  enabled: boolean
  required_scopes: string[]
}

export interface RateLimitRule {
  enabled: boolean
  requests_per_window: number
  window_seconds: number
}

export interface HeaderRule {
  header_name: string
  condition: 'equals' | 'contains' | 'regex' | 'exists'
  value?: string
}

export interface PathRule {
  methods: string[]
  path_pattern: string
  condition: 'equals' | 'prefix' | 'regex'
}

export interface FirewallRuleSet {
  id: string
  name: string
  description?: string
  default_action: 'allow' | 'block'
  ip_rules?: {
    type: 'allow' | 'block'
    cidrs: string[]
  }
  jwt_validation?: {
    enabled: boolean
    issuer?: string
    audience?: string
    required_claims?: Record<string, any>
  }
  oauth2_validation?: {
    enabled: boolean
    required_scopes?: string[]
  }
  rate_limiting?: {
    enabled: boolean
    requests_per_window: number
    window_seconds: number
  }
  header_rules?: Array<{
    header_name: string
    condition: 'equals' | 'contains' | 'regex' | 'exists'
    value?: string
  }>
  path_rules?: Array<{
    methods: string[]
    path_pattern: string
    condition: 'equals' | 'prefix' | 'regex'
  }>
}

export interface SimulationRequest {
  rule_set_id: string
  client_ip: string
  method: string
  path: string
  headers: Record<string, string>
  jwt_token?: string
  oauth_scopes?: string[]
}

export interface SimulationResult {
  decision: 'ALLOWED' | 'BLOCKED'
  reason: string
  matched_rule?: string
  evaluation_details: string[]
  timestamp?: string
}

export interface EvaluationLog {
  timestamp: string
  rule_set_id: string
  client_ip: string
  result: SimulationResult
}

export interface UserStats {
  rule_sets: number
  simulations: number
  logs: number
  session_name: string
  session_id: string
}

interface AppState {
  // User Session
  userStats: UserStats
  sessionInfo: { id: string; name: string; shortId: string }
  
  // App State
  activeTab: 'rules' | 'simulator' | 'logs'
  isLoading: boolean
  error?: string
  
  // Data State
  ruleSets: FirewallRuleSet[]
  currentRuleSet?: FirewallRuleSet
  simulationResult?: SimulationResult
  simulationHistory: SimulationResult[]
  evaluationLogs: EvaluationLog[]
  
  // Session Actions
  initializeSession: () => void
  updateSessionName: (name: string) => void
  resetSession: () => void
  updateUserStats: (stats: Partial<UserStats>) => void
  clearCache: () => void
  
  // App Actions
  setActiveTab: (tab: 'rules' | 'simulator' | 'logs') => void
  setLoading: (loading: boolean) => void
  setError: (error: string | undefined) => void
  
  // Rule Set Actions
  setRuleSets: (ruleSets: FirewallRuleSet[]) => void
  addRuleSet: (ruleSet: FirewallRuleSet) => void
  updateRuleSet: (ruleSet: FirewallRuleSet) => void
  deleteRuleSet: (id: string) => void
  setCurrentRuleSet: (ruleSet: FirewallRuleSet | undefined) => void
  
  // Simulation Actions
  setSimulationResult: (result: SimulationResult | undefined) => void
  addToHistory: (result: SimulationResult) => void
  clearHistory: () => void
  
  // Log Actions
  setEvaluationLogs: (logs: EvaluationLog[]) => void
  addEvaluationLog: (log: EvaluationLog) => void
  clearEvaluationLogs: () => void
}

// Create store with user session integration
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial User Session State
        userStats: {
          rule_sets: 0,
          simulations: 0,
          logs: 0,
          session_name: 'Anonymous User',
          session_id: 'unknown'
        },
        sessionInfo: { id: 'unknown', name: 'Anonymous User', shortId: 'unknown' },
        
        // Initial App State
        activeTab: 'rules',
        isLoading: false,
        error: undefined,
        
        // Initial Data State
        ruleSets: [],
        currentRuleSet: undefined,
        simulationResult: undefined,
        simulationHistory: [],
        evaluationLogs: [],
        
        // Session Actions
        initializeSession: () => {
          if (typeof window !== 'undefined') {
            const session = userSession.getSession()
            const sessionInfo = userSession.getSessionInfo()
            
            set((state) => ({
              sessionInfo,
              userStats: {
                ...state.userStats,
                session_name: session.name,
                session_id: session.id
              }
            }))
            
            // Clear cache if needed
            if (userSession.shouldClearCache()) {
              userSession.clearCache()
              get().clearCache()
            }
          }
        },
        
        updateSessionName: (name: string) => {
          if (typeof window !== 'undefined') {
            userSession.updateSessionName(name)
            const sessionInfo = userSession.getSessionInfo()
            
            set((state) => ({
              sessionInfo,
              userStats: {
                ...state.userStats,
                session_name: name
              }
            }))
          }
        },
        
        resetSession: () => {
          if (typeof window !== 'undefined') {
            const newSession = userSession.resetSession()
            const sessionInfo = userSession.getSessionInfo()
            
            set({
              sessionInfo,
              userStats: {
                rule_sets: 0,
                simulations: 0,
                logs: 0,
                session_name: newSession.name,
                session_id: newSession.id
              },
              ruleSets: [],
              currentRuleSet: undefined,
              simulationResult: undefined,
              simulationHistory: [],
              evaluationLogs: [],
              error: undefined
            })
          }
        },
        
        updateUserStats: (stats: Partial<UserStats>) => {
          set((state) => ({
            userStats: { ...state.userStats, ...stats }
          }))
        },
        
        clearCache: () => {
          set({
            ruleSets: [],
            currentRuleSet: undefined,
            simulationResult: undefined,
            simulationHistory: [],
            evaluationLogs: [],
            error: undefined
          })
        },
        
        // App Actions
        setActiveTab: (tab) => set({ activeTab: tab }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        
        // Rule Set Actions
        setRuleSets: (ruleSets) => {
          set({ ruleSets })
          get().updateUserStats({ rule_sets: ruleSets.length })
        },
        
        addRuleSet: (ruleSet) => {
          set((state) => {
            const newRuleSets = [...state.ruleSets, ruleSet]
            get().updateUserStats({ rule_sets: newRuleSets.length })
            return { ruleSets: newRuleSets }
          })
        },
        
        updateRuleSet: (ruleSet) => {
          set((state) => ({
            ruleSets: state.ruleSets.map((rs) => rs.id === ruleSet.id ? ruleSet : rs)
          }))
        },
        
        deleteRuleSet: (id) => {
          set((state) => {
            const newRuleSets = state.ruleSets.filter((rs) => rs.id !== id)
            get().updateUserStats({ rule_sets: newRuleSets.length })
            return { ruleSets: newRuleSets }
          })
        },
        
        setCurrentRuleSet: (ruleSet) => set({ currentRuleSet: ruleSet }),
        
        // Simulation Actions
        setSimulationResult: (result) => set({ simulationResult: result }),
        
        addToHistory: (result) => {
          set((state) => {
            const newHistory = [result, ...state.simulationHistory].slice(0, 50) // Keep last 50
            get().updateUserStats({ simulations: newHistory.length })
            return { simulationHistory: newHistory }
          })
        },
        
        clearHistory: () => {
          set({ simulationHistory: [] })
          get().updateUserStats({ simulations: 0 })
        },
        
        // Log Actions
        setEvaluationLogs: (logs) => {
          set({ evaluationLogs: logs })
          get().updateUserStats({ logs: logs.length })
        },
        
        addEvaluationLog: (log) => {
          set((state) => {
            const newLogs = [log, ...state.evaluationLogs].slice(0, 100) // Keep last 100
            get().updateUserStats({ logs: newLogs.length })
            return { evaluationLogs: newLogs }
          })
        },
        
        clearEvaluationLogs: () => {
          set({ evaluationLogs: [] })
          get().updateUserStats({ logs: 0 })
        }
      }),
      {
        name: 'zeropass-app-store',
        version: 1,
        // Only persist minimal user session data, not the full data sets
        partialize: (state) => ({
          activeTab: state.activeTab,
          sessionInfo: state.sessionInfo,
          userStats: state.userStats
        }),
        // Merge with user session on hydration
        onRehydrateStorage: () => (state) => {
          if (state && typeof window !== 'undefined') {
            const session = userSession.getSession()
            const sessionInfo = userSession.getSessionInfo()
            
            state.sessionInfo = sessionInfo
            state.userStats = {
              ...state.userStats,
              session_name: session.name,
              session_id: session.id
            }
          }
        }
      }
    ),
    {
      name: 'zeropass-app-store'
    }
  )
)

// Initialize session when store is created
if (typeof window !== 'undefined') {
  useAppStore.getState().initializeSession()
} 