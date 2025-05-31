import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

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
}

export interface SimulationRequest {
  rule_set_id: string
  client_ip: string
  method: string
  path: string
  headers: Record<string, string>
  jwt_token?: string
  oauth_scopes: string[]
}

export interface SimulationResult {
  decision: 'ALLOWED' | 'BLOCKED'
  matched_rule?: string
  reason: string
  evaluation_details: string[]
}

export interface EvaluationLog {
  timestamp: string
  rule_set_id: string
  client_ip: string
  result: SimulationResult
}

interface AppState {
  // Rule Sets
  ruleSets: FirewallRuleSet[]
  currentRuleSet?: FirewallRuleSet
  
  // Simulation
  simulationResult?: SimulationResult
  simulationHistory: SimulationResult[]
  
  // Logs
  evaluationLogs: EvaluationLog[]
  
  // UI State
  activeTab: 'rules' | 'simulator' | 'logs'
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
  
  setActiveTab: (tab: 'rules' | 'simulator' | 'logs') => void
  setLoading: (loading: boolean) => void
  setError: (error?: string) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      ruleSets: [],
      simulationHistory: [],
      evaluationLogs: [],
      activeTab: 'rules',
      isLoading: false,
      
      // Actions
      setRuleSets: (ruleSets) => set({ ruleSets }),
      
      addRuleSet: (ruleSet) => set((state) => ({
        ruleSets: [...state.ruleSets, ruleSet]
      })),
      
      updateRuleSet: (updatedRuleSet) => set((state) => ({
        ruleSets: state.ruleSets.map(rs => 
          rs.id === updatedRuleSet.id ? updatedRuleSet : rs
        ),
        currentRuleSet: state.currentRuleSet?.id === updatedRuleSet.id 
          ? updatedRuleSet 
          : state.currentRuleSet
      })),
      
      deleteRuleSet: (id) => set((state) => ({
        ruleSets: state.ruleSets.filter(rs => rs.id !== id),
        currentRuleSet: state.currentRuleSet?.id === id 
          ? undefined 
          : state.currentRuleSet
      })),
      
      setCurrentRuleSet: (ruleSet) => set({ currentRuleSet: ruleSet }),
      
      setSimulationResult: (result) => set({ simulationResult: result }),
      
      addToHistory: (result) => set((state) => ({
        simulationHistory: [result, ...state.simulationHistory].slice(0, 50) // Keep last 50
      })),
      
      clearHistory: () => set({ simulationHistory: [] }),
      
      setEvaluationLogs: (logs) => set({ evaluationLogs: logs }),
      
      addEvaluationLog: (log) => set((state) => ({
        evaluationLogs: [log, ...state.evaluationLogs].slice(0, 100) // Keep last 100
      })),
      
      clearLogs: () => set({ evaluationLogs: [] }),
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'firewall-simulator-store'
    }
  )
) 