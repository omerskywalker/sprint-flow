'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import type { TicketWithTasks, TicketStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const COLUMNS: TicketStatus[] = ['todo', 'in_progress', 'review', 'done']

interface KanbanBoardProps {
  tickets: TicketWithTasks[]
  queryKey: string[]
}

export function KanbanBoard({ tickets, queryKey }: KanbanBoardProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const statusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => {
      const { error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', ticketId)
      if (error) throw error

      await supabase.from('audit_log').insert({
        entity_type: 'ticket',
        entity_id: ticketId,
        action: status === 'done' ? 'completed' : 'updated',
        notes: `Status changed to ${status}`,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const activeTicket = tickets.find(t => t.id === activeId) ?? null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const ticketId = active.id as string
    const ticket = tickets.find(t => t.id === ticketId)
    if (!ticket) return

    // Determine target column
    let targetStatus: TicketStatus | null = null
    if (COLUMNS.includes(over.id as TicketStatus)) {
      targetStatus = over.id as TicketStatus
    } else {
      // Dropped on a ticket — use that ticket's column
      const overTicket = tickets.find(t => t.id === (over.id as string))
      if (overTicket) targetStatus = overTicket.status
    }

    if (targetStatus && targetStatus !== ticket.status) {
      statusMutation.mutate({ ticketId, status: targetStatus })
    }
  }

  const ticketsByStatus = COLUMNS.reduce((acc, status) => {
    acc[status] = tickets.filter(t => t.status === status)
    return acc
  }, {} as Record<TicketStatus, TicketWithTasks[]>)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(status => (
          <div key={status} className="flex-1 min-w-[240px]">
            <KanbanColumn
              status={status}
              tickets={ticketsByStatus[status]}
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeTicket && (
          <KanbanCard ticket={activeTicket} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  )
}
