import type { ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';
import type { BuildItemType } from '../store/gameStore';
import { DollarSign, MousePointer2, Grid, AlignJustify, DoorOpen, Gamepad2, Coffee, Bath, Trash2 } from 'lucide-react';
import { Inspector } from './Inspector';
import { StaffPanel } from './StaffPanel';

const buildOptions: { id: BuildItemType, name: string, cost: number, icon: ReactNode }[] = [
  { id: null, name: 'Select/Pan', cost: 0, icon: <MousePointer2 size={16} /> },
  { id: 'floor', name: 'Floor', cost: 10, icon: <Grid size={16} /> },
  { id: 'wall', name: 'Wall', cost: 50, icon: <AlignJustify size={16} /> },
  { id: 'door', name: 'Door', cost: 100, icon: <DoorOpen size={16} /> },
  { id: 'arcade_racing', name: 'Racing Cab', cost: 1000, icon: <Gamepad2 size={16} color="red" /> },
  { id: 'arcade_fighting', name: 'Fight Cab', cost: 800, icon: <Gamepad2 size={16} color="blue" /> },
  { id: 'arcade_crane', name: 'Crane Game', cost: 500, icon: <Gamepad2 size={16} color="pink" /> },
  { id: 'vending', name: 'Vending', cost: 300, icon: <Coffee size={16} color="orange" /> },
  { id: 'toilet', name: 'Toilet', cost: 400, icon: <Bath size={16} /> },
  { id: 'trashcan', name: 'Trash Can', cost: 50, icon: <Trash2 size={16} color="gray" /> },
];

export function UI() {
  const { money, reputation, buildMode, setBuildMode, globalEntryFee, setGlobalEntryFee, time, day, isOpen, dailyReport, setDailyReport, saveGame, loadGame } = useGameStore();

  const formatTime = (timeNum: number) => {
    const hours = Math.floor(timeNum);
    const minutes = Math.floor((timeNum - hours) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
      {/* Top HUD */}
      <div className="flex justify-between items-start">
        <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700 pointer-events-auto backdrop-blur-sm flex flex-col gap-2 min-w-[250px]">
          <div className="flex gap-2 mb-2">
             <button onClick={saveGame} className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded">Save</button>
             <button onClick={loadGame} className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded">Load</button>
          </div>
          <div className="flex justify-between items-center">
             <h1 className="text-white text-2xl font-bold text-shadow-md">Arcade Builder</h1>
             <div className="text-right">
                <p className="text-xs text-slate-400 font-bold">DAY {day}</p>
                <p className={`text-lg font-mono ${isOpen ? 'text-green-400' : 'text-red-400'}`}>
                   {formatTime(time)}
                </p>
                <p className="text-[10px] text-slate-500 uppercase">{isOpen ? 'Open' : 'Closed'}</p>
             </div>
          </div>
          <div className="flex justify-between items-center bg-slate-800 p-2 rounded">
            <div className="flex items-center text-green-400 font-mono text-xl">
              <DollarSign size={20} />
              <span>{money.toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-400">Reputation</span>
              <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${reputation}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-2 bg-slate-800 p-2 rounded">
            <label className="text-xs text-slate-400 block mb-1">Entry Fee: ${globalEntryFee}</label>
            <input
              type="range"
              min="0"
              max="20"
              value={globalEntryFee}
              onChange={(e) => setGlobalEntryFee(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700 pointer-events-auto backdrop-blur-sm text-sm text-slate-300">
          <p>WASD/Right-click to Pan</p>
          <p>Scroll to Zoom</p>
          <p>Left-click to Build</p>
        </div>
      </div>

      {/* Side Panels */}
      <Inspector />
      <StaffPanel />

      {/* Daily Report Modal */}
      {dailyReport && (
        <div className="absolute inset-0 bg-black/50 pointer-events-auto flex items-center justify-center z-50">
           <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl min-w-[300px]">
              <h2 className="text-2xl font-bold text-white mb-4">End of Day {day - 1} Report</h2>
              <div className="space-y-2 mb-6">
                 <div className="flex justify-between text-slate-300">
                    <span>Expenses (Electricity, Wages):</span>
                    <span className="text-red-400">-${dailyReport.expenses}</span>
                 </div>
              </div>
              <button
                onClick={() => setDailyReport(null)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded"
              >
                Start Next Day
              </button>
           </div>
        </div>
      )}

      {/* Bottom Build Menu */}
      <div className="flex justify-center mb-4">
        <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700 pointer-events-auto flex gap-2 backdrop-blur-md shadow-2xl">
          {buildOptions.map(opt => (
            <button
              key={String(opt.id)}
              onClick={() => setBuildMode(opt.id)}
              className={`flex flex-col items-center p-3 rounded-lg transition-all min-w-[80px]
                ${buildMode === opt.id
                  ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-400'
                  : 'bg-slate-800 hover:bg-slate-700 border border-transparent hover:border-slate-500'}`}
            >
              <div className="mb-2">{opt.icon}</div>
              <span className="text-xs font-semibold text-white">{opt.name}</span>
              {opt.cost > 0 && (
                <span className="text-[10px] text-green-400 font-mono mt-1">${opt.cost}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
