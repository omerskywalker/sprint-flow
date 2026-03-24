'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  Ticket, MicroTask, Contact, Resource, AuditLogEntry, TicketStatus
} from '@/types'
import { cn, statusLabel, statusColor, pointsToHours, formatDate } from '@/lib/utils'
import { TagBadge } from '@/components/shared/tag-badge'
import { MicroTaskList } from '@/components/tickets/micro-task-list'
import { TicketForm } from '@/components/tickets/ticket-form'
import { DeleteConfirmModal } from '@/components/shared/delete-confirm-modal'
import { CompletionNoteModal } from '@/components/shared/completion-note-modal'
import {
  ArrowLeft, Pencil, Trash2, Plus, ExternalLink, Mail,
  CheckCircle2, Clock, FileText, Users, Link2, History
} from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/lib/store'

type SubTab = 'tasks' | 'contacts' | 'resources' | 'audit'

const STORY_POINTS_DISPLAY: Record<number, string> = {
  1: '1pt · 4h', 2: '2pt · 8h', 3: '3pt · 12h',
  5: '5pt · 20h', 8: '8pt · 32h', 13: '13pt · 52h',
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { activeSprintId } = useAppStore()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [subTab, setSubTab] = useState<SubTab>('tasks')
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  // Contact & resource form state
  const [addingContact, setAddingContact] = useState(false)
  const [addingResource, setAddingResource] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', role: '', notes: '' })
  const [resourceForm, setResourceForm] = useState({ title: '', url: '', notes: '' })

  const queryKey = ['ticket', id]

  const { data: ticket, isLoading } = useQuery<Ticket | null>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('tickets').select('*').eq('id', id).single()
      if (error) return null
      return data
    },
  })

  const { data: microTasks = [] } = useQuery<MicroTask[]>({
    queryKey: ['micro-tasks', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('micro_tasks')
        .select('*')
        .eq('ticket_id', id)
        .order('position')
      return data ?? []
    },
  })

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const { data } = await supabase.from('contacts').select('*').eq('ticket_id', id).order('created_at')
      return data ?? []
    },
  })

  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ['resources', id],
    queryFn: async () => {
      const { data } = await supabase.from('resources').select('*').eq('ticket_id', id).order('created_at')
      return data ?? []
    },
  })

  const { data: auditLog = [] } = useQuery<AuditLogEntry[]>({
    queryKey: ['audit', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_log')
        .select('*')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(50)
      return data ?? []
    },
    enabled: subTab === 'audit',
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tickets').delete().eq('id', id)
      if (error) throw error
      await supabase.from('audit_log').insert({
        entity_type: 'ticket', entity_id: id, action: 'deleted',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprint-detail', activeSprintId] })
      router.back()
    },
  })

  const completeMutation = useMutation({
    mutationFn: async (note: string | null) => {
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'done' as TicketStatus })
        .eq('id', id)
      if (error) throw error
      await supabase.from('audit_log').insert({
        entity_type: 'ticket', entity_id: id, action: 'completed', notes: note,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['sprint-detail', activeSprintId] })
      setShowCompleteModal(false)
    },
  })

  const addContactMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contacts').insert({
        ticket_id: id,
        name: contactForm.name,
        email: contactForm.email || null,
        role: contactForm.role || null,
        notes: contactForm.notes || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', id] })
      setContactForm({ name: '', email: '', role: '', notes: '' })
      setAddingContact(false)
    },
  })

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', contactId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts', id] }),
  })

  const addResourceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('resources').insert({
        ticket_id: id,
        title: resourceForm.title,
        url: resourceForm.url || null,
        notes: resourceForm.notes || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', id] })
      setResourceForm({ title: '', url: '', notes: '' })
      setAddingResource(false)
    },
  })

  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const { error } = await supabase.from('resources').delete().eq('id', resourceId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources', id] }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 rounded-full border-2 dark:border-white/20 border-black/10 border-t-cyan-400 animate-spin" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="dark:text-slate-400 text-stone-500 mb-4">Ticket not found.</p>
        <button onClick={() => router.back()} className="text-sm dark:text-cyan-400 text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const doneTasks = microTasks.filter(t => t.completed && !t.is_acceptance_criteria).length
  const totalTasks = microTasks.filter(t => !t.is_acceptance_criteria).length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
    { id: 'tasks',     label: 'Tasks',     icon: CheckCircle2 },
    { id: 'contacts',  label: 'Contacts',  icon: Users },
    { id: 'resources', label: 'Resources', icon: Link2 },
    { id: 'audit',     label: 'Audit Log', icon: History },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm dark:text-slate-500 text-stone-400 hover:dark:text-slate-300 hover:text-stone-600 mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      {/* Header */}
      <div className={cn(
        'rounded-2xl p-5 border mb-5',
        'dark:bg-[#1a1a1f] bg-white',
        'dark:border-white/6 border-black/8'
      )}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={cn(
                'font-mono text-xs px-2 py-1 rounded-lg',
                'dark:bg-white/6 bg-black/5',
                'dark:text-slate-400 text-stone-500'
              )}>
                {ticket.ticket_number}
              </span>
              <span className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-full',
                ticket.status === 'todo'        && 'bg-zinc-500/15 text-zinc-400',
                ticket.status === 'in_progress' && 'bg-blue-500/15 text-blue-400',
                ticket.status === 'review'      && 'bg-amber-500/15 text-amber-400',
                ticket.status === 'done'        && 'bg-emerald-500/15 text-emerald-400',
              )}>
                {statusLabel(ticket.status)}
              </span>
              <span className={cn(
                'text-xs font-mono px-2.5 py-1 rounded-full',
                'dark:bg-cyan-500/10 bg-cyan-50',
                'dark:text-cyan-400 text-cyan-600'
              )}>
                {STORY_POINTS_DISPLAY[ticket.story_points] ?? `${ticket.story_points}pt`}
              </span>
            </div>
            <h1 className="text-xl font-bold dark:text-white text-stone-900" style={{ fontFamily: 'var(--font-heading)' }}>
              {ticket.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEditForm(true)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors dark:bg-white/6 bg-black/5 dark:text-slate-300 text-stone-600 dark:hover:bg-white/10 hover:bg-black/10"
            >
              <Pencil size={13} />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors dark:bg-red-500/10 bg-red-50 text-red-400 dark:hover:bg-red-500/20 hover:bg-red-100"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>

        {/* Tags */}
        {ticket.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {ticket.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
          </div>
        )}

        {/* Progress */}
        {totalTasks > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="dark:text-slate-500 text-stone-400">Task progress</span>
              <span className="dark:text-slate-400 text-stone-500">{doneTasks}/{totalTasks} tasks · {progress}%</span>
            </div>
            <div className="progress-bar h-1.5">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Mark as Done CTA */}
        {ticket.status !== 'done' && (
          <button
            onClick={() => setShowCompleteModal(true)}
            className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white"
          >
            <CheckCircle2 size={16} />
            Mark as Done
          </button>
        )}

        {ticket.status === 'done' && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 size={16} />
            Completed
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className={cn(
        'flex items-center gap-1 rounded-xl p-1 mb-5',
        'dark:bg-white/5 bg-black/5',
        'border dark:border-white/6 border-black/6'
      )}>
        {SUB_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
                subTab === tab.id
                  ? 'dark:bg-white/10 bg-white dark:text-white text-stone-900 shadow-sm'
                  : 'dark:text-slate-500 text-stone-400 dark:hover:text-slate-300 hover:text-stone-600'
              )}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tasks tab */}
      {subTab === 'tasks' && (
        <div className={cn(
          'rounded-2xl p-5 border',
          'dark:bg-[#1a1a1f] bg-white',
          'dark:border-white/6 border-black/8'
        )}>
          <MicroTaskList
            tasks={microTasks}
            ticketId={ticket.id}
            showAC={true}
            queryKey={['micro-tasks', id]}
          />
        </div>
      )}

      {/* Contacts tab */}
      {subTab === 'contacts' && (
        <div className={cn(
          'rounded-2xl p-5 border space-y-3',
          'dark:bg-[#1a1a1f] bg-white',
          'dark:border-white/6 border-black/8'
        )}>
          {contacts.map(contact => (
            <div key={contact.id} className={cn(
              'flex items-start justify-between gap-3 rounded-xl p-4 border',
              'dark:bg-white/3 bg-black/3',
              'dark:border-white/6 border-black/6'
            )}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium dark:text-slate-200 text-stone-800">{contact.name}</span>
                  {contact.role && (
                    <span className="text-xs dark:text-slate-500 text-stone-400">{contact.role}</span>
                  )}
                </div>
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs dark:text-cyan-400 text-blue-600 hover:underline">
                    <Mail size={11} />{contact.email}
                  </a>
                )}
                {contact.notes && (
                  <p className="text-xs dark:text-slate-500 text-stone-400 mt-1">{contact.notes}</p>
                )}
              </div>
              <button
                onClick={() => deleteContactMutation.mutate(contact.id)}
                className="p-1.5 rounded dark:text-slate-600 text-stone-300 dark:hover:text-red-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {addingContact ? (
            <div className={cn(
              'rounded-xl p-4 border space-y-3',
              'dark:bg-white/3 bg-black/3',
              'dark:border-cyan-500/20 border-blue-200'
            )}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs dark:text-slate-500 text-stone-400 mb-1 block">Name *</label>
                  <input
                    value={contactForm.name}
                    onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm dark:bg-white/5 bg-black/4 dark:text-slate-200 text-stone-800 border dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs dark:text-slate-500 text-stone-400 mb-1 block">Role</label>
                  <input
                    value={contactForm.role}
                    onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm dark:bg-white/5 bg-black/4 dark:text-slate-200 text-stone-800 border dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs dark:text-slate-500 text-stone-400 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm dark:bg-white/5 bg-black/4 dark:text-slate-200 text-stone-800 border dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs dark:text-slate-500 text-stone-400 mb-1 block">Notes</label>
                  <input
                    value={contactForm.notes}
                    onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm dark:bg-white/5 bg-black/4 dark:text-slate-200 text-stone-800 border dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => contactForm.name && addContactMutation.mutate()}
                  className="btn-primary rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                >
                  Add Contact
                </button>
                <button
                  onClick={() => setAddingContact(false)}
                  className="text-xs dark:text-slate-500 text-stone-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingContact(true)}
              className="flex items-center gap-2 text-sm dark:text-slate-500 text-stone-400 dark:hover:text-slate-300 hover:text-stone-600 transition-colors"
            >
              <Plus size={14} />
              Add Contact
            </button>
          )}
        </div>
      )}

      {/* Resources tab */}
      {subTab === 'resources' && (
        <div className={cn(
          'rounded-2xl p-5 border space-y-3',
          'dark:bg-[#1a1a1f] bg-white',
          'dark:border-white/6 border-black/8'
        )}>
          {resources.map(resource => (
            <div key={resource.id} className={cn(
              'flex items-start justify-between gap-3 rounded-xl p-4 border',
              'dark:bg-white/3 bg-black/3',
              'dark:border-white/6 border-black/6'
            )}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium dark:text-slate-200 text-stone-800">{resource.title}</span>
                </div>
                {resource.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs dark:text-cyan-400 text-blue-600 hover:underline"
                  >
                    <ExternalLink size={11} />
                    {resource.url.length > 50 ? resource.url.slice(0, 50) + '…' : resource.url}
                  </a>
                )}
                {resource.notes && (
                  <p className="text-xs dark:text-slate-500 text-stone-400 mt-1">{resource.notes}</p>
                )}
              </div>
              <button
                onClick={() => deleteResourceMutation.mutate(resource.id)}
                className="p-1.5 rounded dark:text-slate-600 text-stone-300 dark:hover:text-red-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {addingResource ? (
            <div className={cn(
              'rounded-xl p-4 border space-y-3',
              'dark:bg-white/3 bg-black/3',
              'dark:border-cyan-500/20 border-blue-200'
            )}>
              <div className="space-y-3">
                <div>
                  <label className="text-xs dark:text-slate-500 text-stone-400 mb-1 block">Title *</label>
                  <input
                    value={resourceForm.title}
                    onChange={e => setResourceForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm dark:bg-white/5 bg-black/4 dark:text-slate-200 text-stone-800 border dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs dark:text-slate-500 text-stone-400 mb-1 block">URL</label>
                  <input
                    type="url"
                    value={resourceForm.url}
                    onChange={e => setResourceForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://"
                    className="w-full rounded-lg px-3 py-2 text-sm dark:bg-white/5 bg-black/4 dark:text-slate-200 text-stone-800 border dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs dark:text-slate-500 text-stone-400 mb-1 block">Notes</label>
                  <input
                    value={resourceForm.notes}
                    onChange={e => setResourceForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm dark:bg-white/5 bg-black/4 dark:text-slate-200 text-stone-800 border dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => resourceForm.title && addResourceMutation.mutate()}
                  className="btn-primary rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                >
                  Add Resource
                </button>
                <button
                  onClick={() => setAddingResource(false)}
                  className="text-xs dark:text-slate-500 text-stone-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingResource(true)}
              className="flex items-center gap-2 text-sm dark:text-slate-500 text-stone-400 dark:hover:text-slate-300 hover:text-stone-600 transition-colors"
            >
              <Plus size={14} />
              Add Resource
            </button>
          )}
        </div>
      )}

      {/* Audit log tab */}
      {subTab === 'audit' && (
        <div className={cn(
          'rounded-2xl p-5 border',
          'dark:bg-[#1a1a1f] bg-white',
          'dark:border-white/6 border-black/8'
        )}>
          {auditLog.length === 0 ? (
            <p className="text-sm dark:text-slate-500 text-stone-400 text-center py-8">
              No activity yet.
            </p>
          ) : (
            <div className="space-y-3">
              {auditLog.map(entry => (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center',
                    entry.action === 'completed' && 'bg-emerald-500/15',
                    entry.action === 'created'   && 'bg-blue-500/15',
                    entry.action === 'deleted'   && 'bg-red-500/15',
                    entry.action === 'updated'   && 'bg-amber-500/15',
                    entry.action === 'unchecked' && 'bg-zinc-500/15',
                  )}>
                    <Clock size={11} className={cn(
                      entry.action === 'completed' && 'text-emerald-400',
                      entry.action === 'created'   && 'text-blue-400',
                      entry.action === 'deleted'   && 'text-red-400',
                      entry.action === 'updated'   && 'text-amber-400',
                      entry.action === 'unchecked' && 'text-zinc-400',
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm dark:text-slate-300 text-stone-700 capitalize">
                        {entry.entity_type} {entry.action}
                      </span>
                      <span className="text-xs dark:text-slate-600 text-stone-400">
                        {new Date(entry.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs dark:text-slate-500 text-stone-400 mt-0.5">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showEditForm && ticket && (
        <TicketForm
          sprintId={ticket.sprint_id}
          ticket={ticket}
          onClose={() => setShowEditForm(false)}
          queryKey={queryKey}
        />
      )}

      <DeleteConfirmModal
        open={showDeleteModal}
        title="Delete Ticket"
        description={`Delete "${ticket.name}"? All tasks, contacts, and resources will be permanently removed.`}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteModal(false)}
        loading={deleteMutation.isPending}
      />

      <CompletionNoteModal
        open={showCompleteModal}
        title="Complete Ticket"
        onConfirm={(note) => completeMutation.mutate(note)}
        onCancel={() => setShowCompleteModal(false)}
        loading={completeMutation.isPending}
      />
    </div>
  )
}
