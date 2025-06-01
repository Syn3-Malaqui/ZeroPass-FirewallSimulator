'use client'

import React, { useState, useEffect } from 'react'
import { Shield, CheckCircle, Loader2, Lock, Users, AlertTriangle, Zap, Server } from 'lucide-react'
import { useAppStore, type RuleTemplate } from '@/lib/store'
import { api, handleAPIError } from '@/lib/api'
import { createPortal } from 'react-dom'

const categoryIcons = {
  'API Security': Shield,
  'Authentication': Lock,
  'Authorization': Users,
  'Admin Security': AlertTriangle,
  'Rate Limiting': Zap,
  'Network Security': Server,
}

const categoryColors = {
  'API Security': 'bg-blue-50 text-blue-700 border-blue-200',
  'Authentication': 'bg-green-50 text-green-700 border-green-200',
  'Authorization': 'bg-purple-50 text-purple-700 border-purple-200',
  'Admin Security': 'bg-red-50 text-red-700 border-red-200',
  'Rate Limiting': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Network Security': 'bg-gray-50 text-gray-700 border-gray-200',
}

interface TemplateGalleryProps {
  onClose?: () => void
}

export function TemplateGallery({ onClose }: TemplateGalleryProps) {
  const { setTemplates, getTemplates, setLoading, setError, addRuleSet } = useAppStore()
  const [templates, setLocalTemplates] = useState<RuleTemplate[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null)
  const [showApplyDialog, setShowApplyDialog] = useState<RuleTemplate | null>(null)
  const [ruleSetName, setRuleSetName] = useState('')
  const [loading, setLocalLoading] = useState(true)
  const [isBrowser, setIsBrowser] = useState(false)

  useEffect(() => {
    setIsBrowser(true)
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLocalLoading(true)
      setError(undefined)
      
      console.log('Loading templates from API...')
      const templates = await api.getTemplates()
      console.log(`Successfully loaded ${templates.length} templates`)
      
      setTemplates(templates)
      setLocalTemplates(templates)
    } catch (error: any) {
      console.error('Error loading templates:', error)
      setError(error.message || 'Failed to load templates')
    } finally {
      setLocalLoading(false)
    }
  }

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory)

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))]

  const handleApplyTemplate = async (template: RuleTemplate, name: string) => {
    try {
      setApplyingTemplate(template.id)
      
      const result = await api.applyTemplate(template.id, name)
      
      // Refresh rule sets to show the new one
      const ruleSets = await api.getRuleSets()
      useAppStore.getState().setRuleSets(ruleSets)
      
      setShowApplyDialog(null)
      setRuleSetName('')
      
      // Show success message
      setError(undefined)
      
      if (onClose) {
        onClose()
      }
    } catch (error) {
      console.error('Failed to apply template:', error)
      setError('Failed to apply template')
    } finally {
      setApplyingTemplate(null)
    }
  }

  const openApplyDialog = (template: RuleTemplate) => {
    setShowApplyDialog(template)
    setRuleSetName(`${template.name} - ${new Date().toLocaleDateString()}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading templates...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rule Templates</h2>
          <p className="text-gray-600 mt-1">
            Pre-configured security rule sets for common scenarios
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategory === category
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category === 'all' ? 'All Categories' : category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const IconComponent = categoryIcons[template.category as keyof typeof categoryIcons] || Shield
          const colorClass = categoryColors[template.category as keyof typeof categoryColors] || categoryColors['API Security']
          
          return (
            <div
              key={template.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-200"
            >
              {/* Template Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg border ${colorClass}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
                      {template.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {template.description}
              </p>

              {/* Template Features */}
              <div className="space-y-2 mb-4">
                {Object.keys(template.rule_configuration).filter(key => 
                  key !== 'id' && key !== 'name' && key !== 'description' && key !== 'userId'
                ).slice(0, 3).map((feature) => (
                  <div key={feature} className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-gray-600 capitalize">
                      {feature.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Apply Button */}
              <button
                onClick={() => openApplyDialog(template)}
                disabled={applyingTemplate === template.id}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {applyingTemplate === template.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <span>Apply Template</span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Apply Template Dialog */}
      {showApplyDialog && isBrowser && createPortal(
        <div className="fixed inset-0 w-screen h-screen bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl relative z-[10000]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Apply Template: {showApplyDialog.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rule Set Name
                </label>
                <input
                  type="text"
                  value={ruleSetName}
                  onChange={(e) => setRuleSetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter a name for your rule set"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowApplyDialog(null)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApplyTemplate(showApplyDialog, ruleSetName)}
                  disabled={!ruleSetName.trim() || applyingTemplate === showApplyDialog.id}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600">
            {selectedCategory === 'all' 
              ? 'No templates are available at the moment.'
              : `No templates found in the "${selectedCategory}" category.`
            }
          </p>
        </div>
      )}
    </div>
  )
} 