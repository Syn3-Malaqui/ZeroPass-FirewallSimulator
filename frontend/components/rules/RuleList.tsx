'use client'

import React from 'react'
import { Edit, Copy, Trash2, Shield, AlertTriangle, Clock } from 'lucide-react'
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rule Sets</h3>
          <p className="text-gray-600 mb-4">Create your first firewall rule set to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-slideUp">
      {ruleSets.map((ruleSet, index) => (
        <div 
          key={ruleSet.id} 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] animate-slideUp"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Header with Name and Default Action Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{ruleSet.name}</h3>
                <div className="flex items-center space-x-2">
                  <span className={`
                    inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border
                    ${ruleSet.default_action === 'allow' 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-red-50 text-red-700 border-red-200'
                    }
                  `}>
                    Default: {ruleSet.default_action}
                  </span>
                </div>
              </div>
              
              {/* Description */}
              {ruleSet.description && (
                <p className="text-gray-600 mb-4 leading-relaxed">{ruleSet.description}</p>
              )}
              
              {/* Rule Set Details */}
              <div className="space-y-3">
                {/* ID */}
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500 font-medium">ID:</span>
                  <code className="text-gray-700 bg-gray-100 px-2 py-1 rounded font-mono text-xs">
                    {ruleSet.id}
                  </code>
                </div>

                {/* Feature Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {ruleSet.ip_rules && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-200">
                      <Shield className="h-3 w-3" />
                      <span>IP Rules ({ruleSet.ip_rules.cidrs?.length || 0})</span>
                    </span>
                  )}
                  {ruleSet.jwt_validation?.enabled && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium border border-purple-200">
                      <Shield className="h-3 w-3" />
                      <span>JWT Validation</span>
                    </span>
                  )}
                  {ruleSet.oauth2_validation?.enabled && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium border border-indigo-200">
                      <Shield className="h-3 w-3" />
                      <span>OAuth2 ({ruleSet.oauth2_validation.required_scopes?.length || 0} scopes)</span>
                    </span>
                  )}
                  {ruleSet.rate_limiting?.enabled && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-medium border border-orange-200">
                      <Clock className="h-3 w-3" />
                      <span>Rate Limit ({ruleSet.rate_limiting.requests_per_window}/{ruleSet.rate_limiting.window_seconds}s)</span>
                    </span>
                  )}
                  {ruleSet.header_rules && ruleSet.header_rules.length > 0 && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-md text-xs font-medium border border-teal-200">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Header Rules ({ruleSet.header_rules.length})</span>
                    </span>
                  )}
                  {ruleSet.path_rules && ruleSet.path_rules.length > 0 && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-cyan-50 text-cyan-700 rounded-md text-xs font-medium border border-cyan-200">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Path Rules ({ruleSet.path_rules.length})</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2 flex-shrink-0">
              <button
                onClick={() => onEdit(ruleSet)}
                className="inline-flex items-center justify-center p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 transform hover:scale-105 active:scale-95"
                title="Edit rule set"
              >
                <Edit className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => onCopy(ruleSet)}
                className="inline-flex items-center justify-center p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 hover:text-blue-900 transition-all duration-200 transform hover:scale-105 active:scale-95"
                title="Copy rule set"
              >
                <Copy className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => onDelete(ruleSet.id)}
                className="inline-flex items-center justify-center p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 hover:text-red-900 transition-all duration-200 transform hover:scale-105 active:scale-95"
                title="Delete rule set"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 