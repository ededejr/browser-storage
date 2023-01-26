import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { BrowserStorageType } from './browser-storage'

interface LogStore {
  logs: string[]
  addLog: (log: string) => void
  clear: () => void
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [] as string[],
  addLog: (log: string) => set((state) => ({ logs: [log, ...state.logs] })),
  clear: () => set(() => ({ logs: [] })),
}));

interface PageContext {
  storageType: BrowserStorageType
}

export const usePageContextStore = create<PageContext>()(
  subscribeWithSelector(() => ({
    storageType: 'session' as BrowserStorageType,
  })));