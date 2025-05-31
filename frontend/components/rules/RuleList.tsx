'use client'

import React from 'react'
import { Edit, Copy, Trash2, Shield, AlertTriangle } from 'lucide-react'
import type { FirewallRuleSet } from '@/lib/store'

interface Props {
  ruleSets: FirewallRuleSet[]
  onEdit: (ruleSet: FirewallRuleSet) => void
  onCopy: (ruleSet: FirewallRuleSet) => void
  onDelete: (id: string) => void
}

export function RuleList({ ruleSets, onEdit, onCopy, onDelete }: Props) {
  if (ruleSets.length === 0) {
    return (
      <div className="card">
        <div className="card-content text-center py-12">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Rule Sets</h3>
          <p className="text-gray-600 mb-4">Create your first firewall rule set to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {ruleSets.map((ruleSet) => (
        <div key={ruleSet.id} className="card">
          <div className="card-content">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{ruleSet.name}</h3>
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${ruleSet.default_action === 'allow' 
                      ? 'bg-success-100 text-success-700' 
                      : 'bg-danger-100 text-danger-700'
                    }
                  `}>
                    Default: {ruleSet.default_action}
                  </span>
                </div>
                
                {ruleSet.description && (
                  <p className="text-gray-600 mb-3">{ruleSet.description}</p>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>ID: {ruleSet.id}</span>
                  {ruleSet.ip_rules && (
                    <span className="flex items-center space-x-1">
                      <Shield className="h-4 w-4" />
                      <span>IP Rules</span>
                    </span>
                  )}
                  {ruleSet.jwt_validation?.enabled && (
                    <span className="flex items-center space-x-1">
                      <Shield className="h-4 w-4" />
                      <span>JWT</span>
                    </span>
                  )}
                  {ruleSet.rate_limiting?.enabled && (
                    <span className="flex items-center space-x-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Rate Limit</span>
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEdit(ruleSet)}
                  className="btn-secondary p-2"
                  title="Edit rule set"
                >
                  <Edit className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => onCopy(ruleSet)}
                  className="btn-secondary p-2"
                  title="Copy rule set"
                >
                  <Copy className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => onDelete(ruleSet.id)}
                  className="btn-danger p-2"
                  title="Delete rule set"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 