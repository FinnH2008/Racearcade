import { create } from 'zustand';

export type BuildItemType = 'floor' | 'wall' | 'door' | 'arcade_racing' | 'arcade_fighting' | 'arcade_crane' | 'vending' | 'toilet' | 'trashcan' | null;

export interface MachineSettings {
  price: number;
}

interface GameState {
  money: number;
  reputation: number;
  day: number;
  time: number; // 0 to 24 (hours)
  isOpen: boolean;
  globalEntryFee: number;
  dailyReport: { income: number, expenses: number } | null;
  machineSettings: Record<string, MachineSettings>;
  buildMode: BuildItemType;
  setBuildMode: (mode: BuildItemType) => void;
  deductMoney: (amount: number) => boolean;
  addMoney: (amount: number) => void;
  setGlobalEntryFee: (fee: number) => void;
  setMachinePrice: (id: string, price: number) => void;
  getMachinePrice: (id: string) => number;
  addReputation: (amount: number) => void;
  advanceTime: (minutes: number) => void;
  setDailyReport: (report: { income: number, expenses: number } | null) => void;
  saveGame: () => void;
  loadGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  money: 5000,
  reputation: 50, // 0 to 100
  day: 1,
  time: 8, // Start at 8 AM
  isOpen: true,
  globalEntryFee: 0, // Default free entry
  dailyReport: null,
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
  })),
  setDailyReport: (report) => set({ dailyReport: report }),
  advanceTime: (minutes) => set((state) => {
    let newTime = state.time + (minutes / 60);
    let newDay = state.day;

    // Time loops at 24 (Midnight)
    if (newTime >= 24) {
      newTime -= 24;
      newDay += 1;
    }

    // Arcade is open from 8 AM to 10 PM (22:00)
    const isOpen = newTime >= 8 && newTime < 22;

    return { time: newTime, day: newDay, isOpen };
  }),
  saveGame: () => {
    const state = get();
    const saveState = {
       money: state.money,
       reputation: state.reputation,
       day: state.day,
       time: state.time,
       globalEntryFee: state.globalEntryFee,
       machineSettings: state.machineSettings
    };
    localStorage.setItem('arcade_save_data', JSON.stringify(saveState));
    window.dispatchEvent(new CustomEvent('save-grid'));
  },
  loadGame: () => {
    const data = localStorage.getItem('arcade_save_data');
    if (data) {
       try {
          const parsed = JSON.parse(data);
          set({
             money: parsed.money || 5000,
             reputation: parsed.reputation || 50,
             day: parsed.day || 1,
             time: parsed.time || 8,
             globalEntryFee: parsed.globalEntryFee || 0,
             machineSettings: parsed.machineSettings || {},
             isOpen: (parsed.time >= 8 && parsed.time < 22)
          });
          window.dispatchEvent(new CustomEvent('load-grid'));
       } catch (e) {
          console.error("Load failed", e);
       }
    }
  }
}));
