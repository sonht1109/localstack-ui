import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LocalStackInstance {
  id: string;
  name: string;
  url: string;
}

interface LocalStackState {
  instances: LocalStackInstance[];
  activeInstanceId: string | null;
  region: string;
  accountId: string;
  addInstance: (instance: Omit<LocalStackInstance, 'id'>) => void;
  removeInstance: (id: string) => void;
  updateInstance: (id: string, updates: Partial<Omit<LocalStackInstance, 'id'>>) => void;
  setActiveInstance: (id: string) => void;
  getActiveInstance: () => LocalStackInstance | undefined;
  setRegion: (region: string) => void;
  setAccountId: (accountId: string) => void;
}

const DEFAULT_INSTANCE: LocalStackInstance = {
  id: 'default',
  name: 'default (localhost)',
  url: 'http://localhost:4566',
};

export const useLocalStackStore = create<LocalStackState>()(
  persist(
    (set, get) => ({
      instances: [DEFAULT_INSTANCE],
      activeInstanceId: 'default',
      region: 'ap-southeast-1',
      accountId: '000000000000',
      addInstance: (instance) => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({
          instances: [...state.instances, { ...instance, id }],
          activeInstanceId: state.instances.length === 0 ? id : state.activeInstanceId,
        }));
      },
      removeInstance: (id) => {
        set((state) => ({
          instances: state.instances.filter((inst) => inst.id !== id),
          activeInstanceId: state.activeInstanceId === id 
            ? (state.instances.find(inst => inst.id !== id)?.id || null)
            : state.activeInstanceId,
        }));
      },
      updateInstance: (id, updates) => {
        set((state) => ({
          instances: state.instances.map((inst) => 
            inst.id === id ? { ...inst, ...updates } : inst
          )
        }));
      },
      setActiveInstance: (id) => set({ activeInstanceId: id }),
      getActiveInstance: () => {
        const { instances, activeInstanceId } = get();
        return instances.find((inst) => inst.id === activeInstanceId);
      },
      setRegion: (region) => set({ region }),
      setAccountId: (accountId) => set({ accountId }),
    }),
    {
      name: 'localstack-ui-storage',
    }
  )
);
