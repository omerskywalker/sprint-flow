'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppStore, Theme, ViewMode } from '@/types'

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeSprintId: null,
      theme: 'dark' as Theme,
      viewMode: 'burndown' as ViewMode,
      setActiveSprintId: (id) => set({ activeSprintId: id }),
      setTheme: (theme) => set({ theme }),
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'sprintflow-store',
      partialize: (state) => ({
        activeSprintId: state.activeSprintId,
        theme: state.theme,
        viewMode: state.viewMode,
      }),
    }
  )
)
