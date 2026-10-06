import { create } from 'zustand';

export type BuildItemType = 'floor' | 'wall' | 'door' | 'arcade_racing' | 'arcade_fighting' | 'arcade_crane' | null;

export interface MachineSettings {
  price: number;
}

interface GameState {
  money: number;
  reputation: number;
  day: number;
  time: number;
  globalEntryFee: number;
  machineSettings: Record<string, MachineSettings>;
  buildMode: BuildItemType;
  setBuildMode: (mode: BuildItemType) => void;
  deductMoney: (amount: number) => boolean;
  addMoney: (amount: number) => void;
  setGlobalEntryFee: (fee: number) => void;
  setMachinePrice: (id: string, price: number) => void;
  getMachinePrice: (id: string) => number;
  addReputation: (amount: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  money: 5000,
  reputation: 50, // 0 to 100
  day: 1,
  time: 0,
  globalEntryFee: 0, // Default free entry
  machineSettings: {},
  buildMode: null,
  setBuildMode: (mode) => set({ buildMode: mode }),
  deductMoney: (amount) => {
    const currentMoney = get().money;
    if (currentMoney >= amount) {
      set({ money: currentMoney - amount });
      return true;
    }
    return false;
  },
  addMoney: (amount) => set((state) => ({ money: state.money + amount })),
  setGlobalEntryFee: (fee) => set({ globalEntryFee: fee }),
  setMachinePrice: (id, price) => set((state) => ({
    machineSettings: {
      ...state.machineSettings,
      [id]: { price }
    }
  })),
  getMachinePrice: (id) => {
    const state = get();
    return state.machineSettings[id]?.price || 2; // default $2
  },
  addReputation: (amount) => set((state) => ({
    reputation: Math.max(0, Math.min(100, state.reputation + amount))
  }))
}));
