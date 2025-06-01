'use client'

import React from 'react'
import { useAppStore } from '@/lib/store'
import { RuleBuilder } from './rules/RuleBuilder'
import { APISimulator } from './simulator/APISimulator'
import { LogViewer } from './logs/LogViewer'

export function Dashboard() {
  const { activeTab } = useAppStore()

  return (
    <div className="space-y-6">
      {activeTab === 'rules' && <RuleBuilder />}
      {activeTab === 'simulator' && <APISimulator />}
      {activeTab === 'logs' && <LogViewer />}
    </div>
  )
} 