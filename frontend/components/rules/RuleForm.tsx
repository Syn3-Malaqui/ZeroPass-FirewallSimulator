'use client'

import React, { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Save, X } from 'lucide-react'
import type { FirewallRuleSet } from '@/lib/store'
import { validateCIDR } from '@/lib/api'

// Validation schema
const ruleFormSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  default_action: z.enum(['allow', 'block']),
  
  // IP Rules
  ip_rules_enabled: z.boolean(),
  ip_rules_type: z.enum(['allow', 'block']),
  ip_rules_cidrs: z.array(z.string()).optional(),
  
  // JWT Validation
  jwt_enabled: z.boolean(),
  jwt_issuer: z.string().optional(),
  jwt_audience: z.string().optional(),
  jwt_required_claims: z.string().optional(), // JSON string
  
  // OAuth2 Validation
  oauth2_enabled: z.boolean(),
  oauth2_scopes: z.array(z.string()).optional(),
  
  // Rate Limiting
  rate_limit_enabled: z.boolean(),
  rate_limit_requests: z.number().min(1).optional(),
  rate_limit_window: z.number().min(1).optional(),
  
  // Header Rules
  header_rules: z.array(z.object({
    header_name: z.string().min(1),
    condition: z.enum(['equals', 'contains', 'regex', 'exists']),
    value: z.string().optional(),
  })).optional(),
  
  // Path Rules
  path_rules: z.array(z.object({
    methods: z.array(z.string()),
    path_pattern: z.string().min(1),
    condition: z.enum(['equals', 'prefix', 'regex']),
  })).optional(),
})

type RuleFormData = z.infer<typeof ruleFormSchema>

interface Props {
  initialData?: FirewallRuleSet
  onSave: (ruleSet: FirewallRuleSet) => void
  onCancel: () => void
  isLoading: boolean
}

export function RuleForm({ initialData, onSave, onCancel, isLoading }: Props) {
  const [activeSection, setActiveSection] = useState<string>('basic')
  
  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      id: initialData?.id || `rule_${Date.now()}`,
      name: initialData?.name || '',
      description: initialData?.description || '',
      default_action: initialData?.default_action || 'allow',
      
      ip_rules_enabled: !!initialData?.ip_rules,
      ip_rules_type: initialData?.ip_rules?.type || 'allow',
      ip_rules_cidrs: initialData?.ip_rules?.cidrs || [],
      
      jwt_enabled: initialData?.jwt_validation?.enabled || false,
      jwt_issuer: initialData?.jwt_validation?.issuer || '',
      jwt_audience: initialData?.jwt_validation?.audience || '',
      jwt_required_claims: initialData?.jwt_validation?.required_claims 
        ? JSON.stringify(initialData.jwt_validation.required_claims, null, 2)
        : '',
      
      oauth2_enabled: initialData?.oauth2_validation?.enabled || false,
      oauth2_scopes: initialData?.oauth2_validation?.required_scopes || [],
      
      rate_limit_enabled: initialData?.rate_limiting?.enabled || false,
      rate_limit_requests: initialData?.rate_limiting?.requests_per_window || 100,
      rate_limit_window: initialData?.rate_limiting?.window_seconds || 60,
      
      header_rules: initialData?.header_rules || [],
      path_rules: initialData?.path_rules || [],
    }
  })

  const { fields: headerRuleFields, append: appendHeaderRule, remove: removeHeaderRule } = useFieldArray({
    control: form.control,
    name: 'header_rules'
  })

  const { fields: pathRuleFields, append: appendPathRule, remove: removePathRule } = useFieldArray({
    control: form.control,
    name: 'path_rules'
  })

  const sections = [
    { id: 'basic', label: 'Basic', shortLabel: 'Basic' },
    { id: 'ip', label: 'IP Rules', shortLabel: 'IP' },
    { id: 'jwt', label: 'JWT Validation', shortLabel: 'JWT' },
    { id: 'oauth2', label: 'OAuth2 Scopes', shortLabel: 'OAuth2' },
    { id: 'rate', label: 'Rate Limiting', shortLabel: 'Rate' },
    { id: 'headers', label: 'Header Rules', shortLabel: 'Headers' },
    { id: 'paths', label: 'Path Rules', shortLabel: 'Paths' },
  ]

  const handleSubmit = form.handleSubmit((data) => {
    // Transform form data to FirewallRuleSet
    const ruleSet: FirewallRuleSet = {
      id: data.id,
      name: data.name,
      description: data.description,
      default_action: data.default_action,
      header_rules: data.header_rules || [],
      path_rules: data.path_rules || [],
    }

    // Add IP rules if enabled
    if (data.ip_rules_enabled && data.ip_rules_cidrs?.length) {
      ruleSet.ip_rules = {
        type: data.ip_rules_type,
        cidrs: data.ip_rules_cidrs,
      }
    }

    // Add JWT validation if enabled
    if (data.jwt_enabled) {
      ruleSet.jwt_validation = {
        enabled: true,
        issuer: data.jwt_issuer || undefined,
        audience: data.jwt_audience || undefined,
        required_claims: data.jwt_required_claims 
          ? JSON.parse(data.jwt_required_claims) 
          : undefined,
      }
    }

    // Add OAuth2 validation if enabled
    if (data.oauth2_enabled) {
      ruleSet.oauth2_validation = {
        enabled: true,
        required_scopes: data.oauth2_scopes || [],
      }
    }

    // Add rate limiting if enabled
    if (data.rate_limit_enabled) {
      ruleSet.rate_limiting = {
        enabled: true,
        requests_per_window: data.rate_limit_requests || 100,
        window_seconds: data.rate_limit_window || 60,
      }
    }

    onSave(ruleSet)
  })

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section Navigation - Mobile Responsive */}
        <div className="w-full overflow-x-auto">
          <div className="flex min-w-max space-x-1 bg-gray-100 p-1 rounded-lg">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`
                  px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0
                  ${activeSection === section.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <span className="sm:hidden">{section.shortLabel}</span>
                <span className="hidden sm:inline">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Basic Settings */}
        {activeSection === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rule Set ID</label>
                <input
                  {...form.register('id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="e.g., api_gateway_rules"
                  disabled={!!initialData}
                />
                {form.formState.errors.id && (
                  <p className="text-xs text-red-600 mt-1">{form.formState.errors.id.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input
                  {...form.register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="e.g., Production API Rules"
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                {...form.register('description')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Describe the purpose of this rule set..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Action</label>
              <select 
                {...form.register('default_action')} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="allow">Allow</option>
                <option value="block">Block</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Action to take when no other rules match
              </p>
            </div>
          </div>
        )}

        {/* IP Rules Section */}
        {activeSection === 'ip' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...form.register('ip_rules_enabled')}
                className="rounded"
              />
              <label className="text-sm font-medium text-gray-700">Enable IP Rules</label>
            </div>

            {form.watch('ip_rules_enabled') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">IP Rule Type</label>
                  <select 
                    {...form.register('ip_rules_type')} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="allow">Allow List (Block others)</option>
                    <option value="block">Block List (Allow others)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CIDR Blocks</label>
                  <div className="space-y-2">
                    {form.watch('ip_rules_cidrs')?.map((_, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          {...form.register(`ip_rules_cidrs.${index}` as const)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="e.g., 192.168.1.0/24"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const current = form.getValues('ip_rules_cidrs') || []
                            form.setValue('ip_rules_cidrs', current.filter((_, i) => i !== index))
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const current = form.getValues('ip_rules_cidrs') || []
                        form.setValue('ip_rules_cidrs', [...current, ''])
                      }}
                      className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add CIDR</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* JWT Validation Section */}
        {activeSection === 'jwt' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...form.register('jwt_enabled')}
                className="rounded"
              />
              <label className="text-sm font-medium text-gray-700">Enable JWT Validation</label>
            </div>

            {form.watch('jwt_enabled') && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">JWT Issuer</label>
                    <input
                      {...form.register('jwt_issuer')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="e.g., https://auth.example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">The issuer claim (iss) to validate</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">JWT Audience</label>
                    <input
                      {...form.register('jwt_audience')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="e.g., api.example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">The audience claim (aud) to validate</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Required Claims (JSON)</label>
                  <textarea
                    {...form.register('jwt_required_claims')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                    placeholder='{"role": "admin", "permissions": ["read", "write"]}'
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">Additional claims that must be present in the JWT</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* OAuth2 Validation Section */}
        {activeSection === 'oauth2' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...form.register('oauth2_enabled')}
                className="rounded"
              />
              <label className="text-sm font-medium text-gray-700">Enable OAuth2 Scope Validation</label>
            </div>

            {form.watch('oauth2_enabled') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Required Scopes</label>
                <div className="space-y-2">
                  {form.watch('oauth2_scopes')?.map((_, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        {...form.register(`oauth2_scopes.${index}` as const)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="e.g., read, write, admin"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = form.getValues('oauth2_scopes') || []
                          form.setValue('oauth2_scopes', current.filter((_, i) => i !== index))
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const current = form.getValues('oauth2_scopes') || []
                      form.setValue('oauth2_scopes', [...current, ''])
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Scope</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Scopes that must be present in the OAuth2 token</p>
              </div>
            )}
          </div>
        )}

        {/* Rate Limiting Section */}
        {activeSection === 'rate' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...form.register('rate_limit_enabled')}
                className="rounded"
              />
              <label className="text-sm font-medium text-gray-700">Enable Rate Limiting</label>
            </div>

            {form.watch('rate_limit_enabled') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Requests per Window</label>
                  <input
                    type="number"
                    {...form.register('rate_limit_requests', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="100"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum number of requests allowed</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Window (seconds)</label>
                  <input
                    type="number"
                    {...form.register('rate_limit_window', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="60"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Time window in seconds</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Header Rules Section */}
        {activeSection === 'headers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Header Rules</h3>
              <button
                type="button"
                onClick={() => appendHeaderRule({ header_name: '', condition: 'equals', value: '' })}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Header Rule</span>
              </button>
            </div>

            {headerRuleFields.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">No header rules defined. Click "Add Header Rule" to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {headerRuleFields.map((field, index) => (
                  <div key={field.id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                      <div className="sm:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Header Name</label>
                        <input
                          {...form.register(`header_rules.${index}.header_name` as const)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Authorization"
                        />
                      </div>
                      
                      <div className="sm:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Condition</label>
                        <select
                          {...form.register(`header_rules.${index}.condition` as const)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="equals">Equals</option>
                          <option value="contains">Contains</option>
                          <option value="regex">Regex</option>
                          <option value="exists">Exists</option>
                        </select>
                      </div>
                      
                      <div className="sm:col-span-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Value</label>
                        <input
                          {...form.register(`header_rules.${index}.value` as const)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Bearer token..."
                          disabled={form.watch(`header_rules.${index}.condition`) === 'exists'}
                        />
                      </div>
                      
                      <div className="sm:col-span-1">
                        <button
                          type="button"
                          onClick={() => removeHeaderRule(index)}
                          className="w-full p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Path Rules Section */}
        {activeSection === 'paths' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Path Rules</h3>
              <button
                type="button"
                onClick={() => appendPathRule({ methods: ['GET'], path_pattern: '', condition: 'equals' })}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Path Rule</span>
              </button>
            </div>

            {pathRuleFields.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">No path rules defined. Click "Add Path Rule" to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pathRuleFields.map((field, index) => (
                  <div key={field.id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                      <div className="sm:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">HTTP Methods</label>
                        <div className="space-y-1">
                          {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((method) => (
                            <label key={method} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                value={method}
                                {...form.register(`path_rules.${index}.methods` as const)}
                                className="rounded"
                              />
                              <span className="text-sm">{method}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div className="sm:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Condition</label>
                        <select
                          {...form.register(`path_rules.${index}.condition` as const)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="equals">Equals</option>
                          <option value="prefix">Starts With</option>
                          <option value="regex">Regex</option>
                        </select>
                      </div>
                      
                      <div className="sm:col-span-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Path Pattern</label>
                        <input
                          {...form.register(`path_rules.${index}.path_pattern` as const)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="/api/users"
                        />
                      </div>
                      
                      <div className="sm:col-span-1">
                        <button
                          type="button"
                          onClick={() => removePathRule(index)}
                          className="w-full p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-5 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </button>
          
          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            disabled={isLoading}
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? 'Saving...' : 'Save Rule Set'}</span>
          </button>
        </div>
      </form>
    </div>
  )
} 