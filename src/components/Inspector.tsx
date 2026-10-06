import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { X } from 'lucide-react';

// Using a custom event to tell React when a machine is clicked
export function Inspector() {
  const [inspectedMachine, setInspectedMachine] = useState<string | null>(null);
  const [machineType, setMachineType] = useState<string>('');

  const store = useGameStore();

  useEffect(() => {
    const handleInspect = (e: any) => {
      setInspectedMachine(e.detail.id);
      setMachineType(e.detail.type);
    };

    window.addEventListener('inspect-machine', handleInspect);
    return () => window.removeEventListener('inspect-machine', handleInspect);
  }, []);

  if (!inspectedMachine) return null;

  const currentPrice = store.getMachinePrice(inspectedMachine);

  return (
    <div className="absolute right-4 top-1/4 bg-slate-900/95 border border-blue-500/50 p-4 rounded-xl shadow-2xl pointer-events-auto w-64 backdrop-blur-md">
      <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-2">
        <div>
          <h2 className="text-white font-bold capitalize text-lg">
            {machineType.replace('arcade_', '')} Machine
          </h2>
          <p className="text-xs text-slate-400 font-mono text-ellipsis overflow-hidden">ID: {inspectedMachine}</p>
        </div>
        <button
          onClick={() => setInspectedMachine(null)}
          className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1 flex justify-between">
            <span>Cost per play:</span>
            <span className="text-green-400 font-mono">${currentPrice}</span>
          </label>
          <div className="flex gap-2">
             <button
                onClick={() => store.setMachinePrice(inspectedMachine, Math.max(1, currentPrice - 1))}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded border border-slate-600"
             >
               -
             </button>
             <input
                type="number"
                value={currentPrice}
                readOnly
                className="w-full bg-slate-950 text-center text-white border border-slate-700 rounded font-mono"
             />
             <button
                onClick={() => store.setMachinePrice(inspectedMachine, currentPrice + 1)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded border border-slate-600"
             >
               +
             </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 bg-slate-950 p-2 rounded">
          Customers will get angry if the price exceeds their patience level or budget. High prices lower reputation!
        </div>
      </div>
    </div>
  );
}
