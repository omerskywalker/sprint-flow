'use client'

import { useState } from 'react'
import { Check, Plus, Trash2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MicroTask } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CompletionNoteModal } from '@/components/shared/completion-note-modal'
import { toast } from '@/components/shared/toast'
import { DeleteConfirmModal } from '@/components/shared/delete-confirm-modal'

interface MicroTaskListProps {
  tasks: MicroTask[]
  ticketId: string
  showAC?: boolean  // show acceptance criteria section
  queryKey: string[]
}

export function MicroTaskList({ tasks, ticketId, showAC = false, queryKey }: MicroTaskListProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: authUser } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    staleTime: Infinity,
  })

  const [completionModal, setCompletionModal] = useState<{ open: boolean; taskId: string }>({
    open: false,
    taskId: '',
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; taskId: string }>({
    open: false,
    taskId: '',
  })
  const [newTaskText, setNewTaskText] = useState('')
  const [newACText, setNewACText] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [addingAC, setAddingAC] = useState(false)

  const regularTasks = tasks.filter(t => !t.is_acceptance_criteria)
  const acTasks = tasks.filter(t => t.is_acceptance_criteria)

  const toggleMutation = useMutation({
    mutationFn: async ({ task, note }: { task: MicroTask; note: string | null }) => {
      const newCompleted = !task.completed
      const { error } = await supabase
        .from('micro_tasks')
        .update({ completed: newCompleted })
        .eq('id', task.id)
      if (error) throw error

      await supabase.from('audit_log').insert({
        user_id: authUser?.id,
        entity_type: 'micro_task',
        entity_id: task.id,
        action: newCompleted ? 'completed' : 'unchecked',
        notes: note,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast('Failed to update task'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('micro_tasks')
        .delete()
        .eq('id', taskId)
      if (error) throw error

      await supabase.from('audit_log').insert({
        user_id: authUser?.id,
        entity_type: 'micro_task',
        entity_id: taskId,
        action: 'deleted',
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast('Failed to delete task'),
  })

  const addTaskMutation = useMutation({
    mutationFn: async ({ description, isAC }: { description: string; isAC: boolean }) => {
      const maxPos = tasks.filter(t => t.is_acceptance_criteria === isAC)
        .reduce((max, t) => Math.max(max, t.position), -1)
      const { data, error } = await supabase
        .from('micro_tasks')
        .insert({
          ticket_id: ticketId,
          description,
          is_acceptance_criteria: isAC,
          position: maxPos + 1,
        })
        .select()
        .single()
      if (error) throw error

      await supabase.from('audit_log').insert({
        user_id: authUser?.id,
        entity_type: 'micro_task',
        entity_id: data.id,
        action: 'created',
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast('Failed to add task'),
  })

  const handleToggle = (task: MicroTask) => {
    if (!task.completed) {
      // Completing — show note modal
      setCompletionModal({ open: true, taskId: task.id })
    } else {
      toggleMutation.mutate({ task, note: null })
    }
  }

  const handleCompletionConfirm = (note: string | null) => {
    const task = tasks.find(t => t.id === completionModal.taskId)
    if (task) toggleMutation.mutate({ task, note })
    setCompletionModal({ open: false, taskId: '' })
  }

  const handleAddTask = async (isAC: boolean) => {
    const text = isAC ? newACText.trim() : newTaskText.trim()
    if (!text) return
    await addTaskMutation.mutateAsync({ description: text, isAC })
    if (isAC) {
      setNewACText('')
      setAddingAC(false)
    } else {
      setNewTaskText('')
      setAddingTask(false)
    }
  }

  const TaskSection = ({ taskList, isAC }: { taskList: MicroTask[]; isAC: boolean }) => {
    const isAdding = isAC ? addingAC : addingTask
    const newText = isAC ? newACText : newTaskText
    const setNewText = isAC ? setNewACText : setNewTaskText
    const setIsAdding = isAC ? setAddingAC : setAddingTask

    return (
      <div>
        {taskList.length > 0 && (
          <div className="space-y-1">
            {taskList.map(task => (
              <div
                key={task.id}
                className={cn(
                  'group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors',
                  'dark:hover:bg-white/4 hover:bg-black/4'
                )}
              >
                <GripVertical size={14} className="mt-0.5 shrink-0 dark:text-slate-700 text-stone-300 opacity-0 group-hover:opacity-100 cursor-grab" />
                <button
                  onClick={() => handleToggle(task)}
                  className={cn(
                    'mt-0.5 shrink-0 h-4 w-4 rounded border-2 transition-all flex items-center justify-center',
                    task.completed
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-600 hover:border-slate-400'
                  )}
                >
                  {task.completed && <Check size={10} className="text-white" strokeWidth={3} />}
                </button>
                <span className={cn(
                  'flex-1 text-sm leading-relaxed',
                  task.completed
                    ? 'line-through dark:text-slate-600 text-stone-400'
                    : 'dark:text-slate-300 text-stone-700'
                )}>
                  {task.description}
                </span>
                <button
                  onClick={() => setDeleteModal({ open: true, taskId: task.id })}
                  className="shrink-0 rounded p-1 dark:text-slate-700 text-stone-300 opacity-0 group-hover:opacity-100 dark:hover:text-red-400 hover:text-red-500 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add task input */}
        {isAdding ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddTask(isAC)
                if (e.key === 'Escape') {
                  setIsAdding(false)
                  setNewText('')
                }
              }}
              placeholder={isAC ? 'Acceptance criteria…' : 'Task description…'}
              className={cn(
                'flex-1 rounded-lg px-3 py-1.5 text-sm',
                'dark:bg-white/5 bg-black/5',
                'dark:text-slate-200 text-stone-800',
                'dark:border-white/10 border-black/10 border',
                'placeholder:dark:text-slate-600 placeholder:text-stone-400',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500/30'
              )}
            />
            <button
              onClick={() => handleAddTask(isAC)}
              className="btn-primary rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            >
              Add
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewText('') }}
              className="text-xs dark:text-slate-500 text-stone-400 hover:dark:text-slate-300 hover:text-stone-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className={cn(
              'mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors',
              'dark:text-slate-600 text-stone-400',
              'dark:hover:text-slate-400 hover:text-stone-600',
              'dark:hover:bg-white/4 hover:bg-black/4'
            )}
          >
            <Plus size={13} />
            Add {isAC ? 'acceptance criteria' : 'task'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Regular tasks */}
      <div>
        <TaskSection taskList={regularTasks} isAC={false} />
      </div>

      {/* Acceptance criteria */}
      {showAC && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide dark:text-slate-500 text-stone-400 mb-2">
            Acceptance Criteria
          </h4>
          <TaskSection taskList={acTasks} isAC={true} />
        </div>
      )}

      {/* Modals */}
      <CompletionNoteModal
        open={completionModal.open}
        title="Complete Task"
        onConfirm={handleCompletionConfirm}
        onCancel={() => setCompletionModal({ open: false, taskId: '' })}
        loading={toggleMutation.isPending}
      />

      <DeleteConfirmModal
        open={deleteModal.open}
        title="Delete Task"
        description="Delete this micro-task? This action cannot be undone."
        onConfirm={() => {
          deleteMutation.mutate(deleteModal.taskId)
          setDeleteModal({ open: false, taskId: '' })
        }}
        onCancel={() => setDeleteModal({ open: false, taskId: '' })}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
