'use client'

import React from 'react'
import { useAppStore } from '@/lib/store'
import { RuleBuilder } from './rules/RuleBuilder'
import { APISimulator } from './simulator/APISimulator'
import { EvaluationLogs } from './logs/EvaluationLogs'

export function Dashboard() {
  const { activeTab } = useAppStore()

  return (
    <div className="space-y-6">
      {activeTab === 'rules' && <RuleBuilder />}
      {activeTab === 'simulator' && <APISimulator />}
      {activeTab === 'logs' && <EvaluationLogs />}
    </div>
  )
} 