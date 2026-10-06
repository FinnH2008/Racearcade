import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Users, Wrench, Sparkles } from 'lucide-react';

export function StaffPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const store = useGameStore();

  const hireJanitor = () => {
    if (store.deductMoney(500)) {
       window.dispatchEvent(new CustomEvent('hire-staff', { detail: { type: 'janitor' } }));
    }
  };

  const hireMechanic = () => {
    if (store.deductMoney(800)) {
       window.dispatchEvent(new CustomEvent('hire-staff', { detail: { type: 'mechanic' } }));
    }
  };

  if (!isOpen) {
    return (
       <button
         onClick={() => setIsOpen(true)}
         className="absolute left-4 top-1/4 bg-slate-900/90 p-3 rounded-lg border border-slate-700 pointer-events-auto hover:bg-slate-800 transition-colors flex flex-col items-center gap-1 shadow-xl"
       >
          <Users size={24} className="text-white" />
          <span className="text-[10px] text-white font-bold">STAFF</span>
       </button>
    );
  }

  return (
    <div className="absolute left-4 top-1/4 bg-slate-900/95 border border-slate-600 p-4 rounded-xl shadow-2xl pointer-events-auto w-64 backdrop-blur-md">
      <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-2">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
           <Users size={18} />
           Hire Staff
        </h2>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded text-sm"
        >
          Close
        </button>
      </div>

      <div className="space-y-3">
        <div className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-600 border border-cyan-400 flex items-center justify-center">
                 <Sparkles size={16} className="text-white" />
              </div>
              <div>
                 <p className="text-sm text-white font-bold">Janitor</p>
                 <p className="text-[10px] text-slate-400">Cleans up trash.</p>
              </div>
           </div>
           <button
             onClick={hireJanitor}
             disabled={store.money < 500}
             className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-2 py-1 rounded text-xs font-bold"
           >
             $500
           </button>
        </div>

        <div className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-600 border border-yellow-400 flex items-center justify-center">
                 <Wrench size={16} className="text-white" />
              </div>
              <div>
                 <p className="text-sm text-white font-bold">Mechanic</p>
                 <p className="text-[10px] text-slate-400">Repairs machines.</p>
              </div>
           </div>
           <button
             onClick={hireMechanic}
             disabled={store.money < 800}
             className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-2 py-1 rounded text-xs font-bold"
           >
             $800
           </button>
        </div>
      </div>
    </div>
  );
}
