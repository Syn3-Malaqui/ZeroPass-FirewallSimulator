'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Save, Trash2, Edit, Copy } from 'lucide-react'
import { useAppStore, type FirewallRuleSet } from '@/lib/store'
import { api, handleAPIError } from '@/lib/api'
import { RuleForm } from './RuleForm'
import { RuleList } from './RuleList'

export function RuleBuilder() {
  const { 
    ruleSets, 
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

  useEffect(() => {
    loadRuleSets()
  }, [])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Firewall Rule Builder</h2>
          <p className="text-gray-600">Create and manage API gateway firewall rules</p>
        </div>
        
        {!showForm && (
          <button
            onClick={handleCreateNew}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Rule Set</span>
          </button>
        )}
      </div>

      {/* Form or List */}
      {showForm ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              {editMode ? 'Edit Rule Set' : 'Create New Rule Set'}
            </h3>
            <p className="card-description">
              Configure firewall rules for your API gateway
            </p>
          </div>
          <div className="card-content">
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