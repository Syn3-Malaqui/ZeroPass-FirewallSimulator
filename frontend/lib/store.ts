import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { getCurrentUserId, addUserIdToData, filterByCurrentUser, getUserStorageKey, clearAllCaches, initializeUser } from './user'

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
  ip_rules?: IPRule
  jwt_validation?: JWTRule
  oauth2_validation?: OAuth2Rule
  rate_limiting?: RateLimitRule
  header_rules: HeaderRule[]
  path_rules: PathRule[]
  default_action: 'allow' | 'block'
  userId?: string // Added for user isolation
}

export interface SimulationRequest {
  rule_set_id: string
  client_ip: string
  method: string
  path: string
  headers: Record<string, string>
  jwt_token?: string
  oauth_scopes: string[]
  userId?: string // Added for user isolation
}

export interface SimulationResult {
  decision: 'ALLOWED' | 'BLOCKED'
  matched_rule?: string
  reason: string
  evaluation_details: string[]
  userId?: string // Added for user isolation
}

export interface EvaluationLog {
  timestamp: string
  rule_set_id: string
  client_ip: string
  result: SimulationResult
  userId?: string // Added for user isolation
}

export interface RuleTemplate {
  id: string
  name: string
  description: string
  category: string
  rule_configuration: Record<string, any>
  is_public: boolean
  created_by?: string
  created_at?: string
  userId?: string
}

export interface ExploitScenario {
  id: string
  name: string
  description: string
  category: string
  attack_type: string
  test_requests: Array<Record<string, any>>
  expected_results: string[]
  is_public: boolean
  created_by?: string
  created_at?: string
  userId?: string
}

export interface ScenarioTestResult {
  scenario_id: string
  rule_set_id: string
  total_tests: number
  passed_tests: number
  failed_tests: number
  test_details: Array<Record<string, any>>
  coverage_score: number
  effectiveness_score: number
  userId?: string
}

interface AppState {
  // User management
  currentUserId: string
  
  // Rule Sets - internally stores all data, but getters filter by user
  _ruleSets: FirewallRuleSet[]
  currentRuleSet?: FirewallRuleSet
  
  // Templates and Scenarios
  _templates: RuleTemplate[]
  _scenarios: ExploitScenario[]
  _testResults: ScenarioTestResult[]
  
  // Simulation
  simulationResult?: SimulationResult
  _simulationHistory: SimulationResult[]
  
  // Logs
  _evaluationLogs: EvaluationLog[]
  
  // UI State
  activeTab: 'rules' | 'simulator' | 'logs' | 'templates' | 'testing'
  debugMode: boolean
  isLoading: boolean
  error?: string
  
  // Actions
  setRuleSets: (ruleSets: FirewallRuleSet[]) => void
  addRuleSet: (ruleSet: FirewallRuleSet) => void
  updateRuleSet: (ruleSet: FirewallRuleSet) => void
  deleteRuleSet: (id: string) => void
  setCurrentRuleSet: (ruleSet?: FirewallRuleSet) => void
  
  setSimulationResult: (result: SimulationResult) => void
  addToHistory: (result: SimulationResult) => void
  clearHistory: () => void
  
  setEvaluationLogs: (logs: EvaluationLog[]) => void
  addEvaluationLog: (log: EvaluationLog) => void
  clearLogs: () => void
  
  setActiveTab: (tab: 'rules' | 'simulator' | 'logs' | 'templates' | 'testing') => void
  setDebugMode: (debug: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error?: string) => void
  
  // Template and Scenario actions
  setTemplates: (templates: RuleTemplate[]) => void
  setScenarios: (scenarios: ExploitScenario[]) => void
  addTestResult: (result: ScenarioTestResult) => void
  clearTestResults: () => void
  
  // User management actions
  initializeUserSession: () => void
  clearUserData: () => void
  
  // Getters for filtered data
  getRuleSets: () => FirewallRuleSet[]
  getSimulationHistory: () => SimulationResult[]
  getEvaluationLogs: () => EvaluationLog[]
  getTemplates: () => RuleTemplate[]
  getScenarios: () => ExploitScenario[]
  getTestResults: () => ScenarioTestResult[]
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initialize user session
        currentUserId: '',
        
        // Internal state (stores all users' data)
        _ruleSets: [],
        _simulationHistory: [],
        _evaluationLogs: [],
        
        // Templates and Scenarios
        _templates: [],
        _scenarios: [],
        _testResults: [],
        
        // UI State
        activeTab: 'rules',
        debugMode: false,
        isLoading: false,
        
        // User management
        initializeUserSession: () => {
          const user = initializeUser()
          set({ currentUserId: user.id })
        },
        
        clearUserData: () => {
          clearAllCaches()
          set({
            _ruleSets: [],
            _simulationHistory: [],
            _evaluationLogs: [],
            _templates: [],
            _scenarios: [],
            _testResults: [],
            currentRuleSet: undefined,
            simulationResult: undefined,
            error: undefined
          })
        },
        
        // Getters for filtered data (SSR-safe)
        getRuleSets: () => {
          const state = get()
          return filterByCurrentUser(state._ruleSets)
        },
        
        getSimulationHistory: () => {
          const state = get()
          return filterByCurrentUser(state._simulationHistory)
        },
        
        getEvaluationLogs: () => {
          const state = get()
          return filterByCurrentUser(state._evaluationLogs)
        },
        
        getTemplates: () => {
          const state = get()
          return state._templates // Templates can be public, so no user filtering needed
        },
        
        getScenarios: () => {
          const state = get()
          return state._scenarios // Scenarios can be public, so no user filtering needed
        },
        
        getTestResults: () => {
          const state = get()
          return filterByCurrentUser(state._testResults)
        },
        
        // Actions - automatically add user ID to data
        setRuleSets: (ruleSets) => {
          const userRuleSets = ruleSets.map(rs => addUserIdToData(rs))
          set((state) => ({
            _ruleSets: [
              ...state._ruleSets.filter(rs => rs.userId !== getCurrentUserId()),
              ...userRuleSets
            ]
          }))
        },
        
        addRuleSet: (ruleSet) => {
          const userRuleSet = addUserIdToData(ruleSet)
          set((state) => ({
            _ruleSets: [...state._ruleSets, userRuleSet]
          }))
        },
        
        updateRuleSet: (updatedRuleSet) => {
          const userRuleSet = addUserIdToData(updatedRuleSet)
          set((state) => ({
            _ruleSets: state._ruleSets.map(rs => 
              rs.id === updatedRuleSet.id && rs.userId === getCurrentUserId() 
                ? userRuleSet 
                : rs
            ),
            currentRuleSet: state.currentRuleSet?.id === updatedRuleSet.id 
              ? userRuleSet 
              : state.currentRuleSet
          }))
        },
        
        deleteRuleSet: (id) => set((state) => ({
          _ruleSets: state._ruleSets.filter(rs => 
            !(rs.id === id && rs.userId === getCurrentUserId())
          ),
          currentRuleSet: state.currentRuleSet?.id === id 
            ? undefined 
            : state.currentRuleSet
        })),
        
        setCurrentRuleSet: (ruleSet) => set({ currentRuleSet: ruleSet }),
        
        setSimulationResult: (result) => {
          const userResult = addUserIdToData(result)
          set({ simulationResult: userResult })
        },
        
        addToHistory: (result) => {
          const userResult = addUserIdToData(result)
          set((state) => ({
            _simulationHistory: [userResult, ...state._simulationHistory].slice(0, 200) // Keep last 200 total
          }))
        },
        
        clearHistory: () => set((state) => ({
          _simulationHistory: state._simulationHistory.filter(
            item => item.userId !== getCurrentUserId()
          )
        })),
        
        setEvaluationLogs: (logs) => {
          const userLogs = logs.map(log => addUserIdToData(log))
          set((state) => ({
            _evaluationLogs: [
              ...state._evaluationLogs.filter(log => log.userId !== getCurrentUserId()),
              ...userLogs
            ]
          }))
        },
        
        addEvaluationLog: (log) => {
          const userLog = addUserIdToData(log)
          set((state) => ({
            _evaluationLogs: [userLog, ...state._evaluationLogs].slice(0, 500) // Keep last 500 total
          }))
        },
        
        clearLogs: () => set((state) => ({
          _evaluationLogs: state._evaluationLogs.filter(
            log => log.userId !== getCurrentUserId()
          )
        })),
        
        setActiveTab: (tab) => set({ activeTab: tab }),
        setDebugMode: (debug) => set({ debugMode: debug }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        
        // Template and Scenario actions
        setTemplates: (templates) => set({ _templates: templates }),
        setScenarios: (scenarios) => set({ _scenarios: scenarios }),
        addTestResult: (result) => set((state) => ({
          _testResults: [...state._testResults, result]
        })),
        clearTestResults: () => set({ _testResults: [] }),
      }),
      {
        name: 'firewall-simulator-store',
        // Use user-specific storage key
        partialize: (state) => ({
          _ruleSets: state._ruleSets,
          _simulationHistory: state._simulationHistory,
          _evaluationLogs: state._evaluationLogs,
          currentUserId: state.currentUserId
        }),
        // Clear cache on new session
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.initializeUserSession()
          }
        }
      }
    ),
    {
      name: 'firewall-simulator-store'
    }
  )
)

// Export convenience hooks that use the getters
export const useRuleSets = () => useAppStore(state => state.getRuleSets())
export const useSimulationHistory = () => useAppStore(state => state.getSimulationHistory())
export const useEvaluationLogs = () => useAppStore(state => state.getEvaluationLogs())
export const useTemplates = () => useAppStore(state => state.getTemplates())
export const useScenarios = () => useAppStore(state => state.getScenarios())
export const useTestResults = () => useAppStore(state => state.getTestResults()) 