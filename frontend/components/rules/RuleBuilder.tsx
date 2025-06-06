'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Save, Trash2, Edit, Copy } from 'lucide-react'
import { useAppStore, useRuleSets, type FirewallRuleSet } from '@/lib/store'
import { api, handleAPIError } from '@/lib/api'
import { RuleForm } from './RuleForm'
import { RuleList } from './RuleList'
import { RuleSetRecovery } from '../RuleSetRecovery'

export function RuleBuilder() {
  const ruleSets = useRuleSets()
  const { 
    currentRuleSet, 
    setRuleSets, 
    setCurrentRuleSet, 
    addRuleSet, 
    updateRuleSet,
    deleteRuleSet,
    setLoading, 
    setError 
  } = useAppStore()
  
  const [showForm, setShowForm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)

  useEffect(() => {
    loadRuleSets()
  }, [])

  useEffect(() => {
    // Show recovery component when user has no rule sets
    setShowRecovery(ruleSets.length === 0)
  }, [ruleSets])

  const loadRuleSets = async () => {
    try {
      setLoading(true)
      const rules = await api.getRuleSets()
      setRuleSets(rules)
    } catch (error) {
      setError(handleAPIError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setCurrentRuleSet(undefined)
    setEditMode(false)
    setShowForm(true)
  }

  const handleEdit = (ruleSet: FirewallRuleSet) => {
    setCurrentRuleSet(ruleSet)
    setEditMode(true)
    setShowForm(true)
  }

  const handleCopy = (ruleSet: FirewallRuleSet) => {
    const copy = {
      ...ruleSet,
      id: `${ruleSet.id}_copy_${Date.now()}`,
      name: `${ruleSet.name} (Copy)`
    }
    setCurrentRuleSet(copy)
    setEditMode(false)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule set?')) return
    
    try {
      setLoading(true)
      await api.deleteRuleSet(id)
      deleteRuleSet(id)
      if (currentRuleSet?.id === id) {
        setCurrentRuleSet(undefined)
      }
    } catch (error) {
      setError(handleAPIError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (ruleSet: FirewallRuleSet) => {
    try {
      setLoading(true)
      
      if (editMode && currentRuleSet) {
        await api.updateRuleSet(ruleSet)
        updateRuleSet(ruleSet)
      } else {
        await api.createRuleSet(ruleSet)
        addRuleSet(ruleSet)
      }
      
      setShowForm(false)
      setCurrentRuleSet(undefined)
      await loadRuleSets() // Refresh the list
    } catch (error) {
      setError(handleAPIError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setCurrentRuleSet(undefined)
    setEditMode(false)
  }

  const handleRecoveryComplete = () => {
    loadRuleSets() // Reload rule sets after recovery
    setShowRecovery(false)
  }

  return (
    <div className="space-y-5 animate-slideUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold text-gray-900">Firewall Rule Builder</h2>
          <p className="text-gray-600 mt-1">Create and manage API gateway firewall rules</p>
        </div>
        
        {!showForm && (
          <button
            onClick={handleCreateNew}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Rule Set</span>
          </button>
        )}
      </div>

      {/* Recovery option */}
      {showRecovery && !showForm && (
        <RuleSetRecovery onComplete={handleRecoveryComplete} />
      )}

      {/* Form or List */}
      {showForm ? (
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-gray-900">
              {editMode ? 'Edit Rule Set' : 'Create New Rule Set'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure firewall rules for your API gateway
            </p>
          </div>
          <div>
            <RuleForm
              initialData={currentRuleSet}
              onSave={handleSave}
              onCancel={handleCancel}
              isLoading={false}
            />
          </div>
        </div>
      ) : (
        <RuleList
          ruleSets={ruleSets}
          onEdit={handleEdit}
          onCopy={handleCopy}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
} 