import { Smartphone, Monitor, Plus } from 'lucide-react';

interface InstanceTabsProps {
  activeInstance: string;
  instances: string[];
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export default function InstanceTabs({ activeInstance, instances, onSelect, onAdd }: InstanceTabsProps) {

  return (
    <div className="flex items-center gap-2 px-4 bg-[#1C1C1E] border-b border-white/5 h-14 w-full">
      <div className="mr-4 flex items-center gap-2 text-gray-400 font-bold uppercase text-[11px] tracking-wider select-none">
        <Monitor size={16} />
        <span>Instâncias</span>
      </div>

      {/* Dynamic Instance Tabs */}
      {instances.map((id) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`
            h-9 px-4 rounded-lg flex items-center justify-center gap-2 transition-all relative
            ${activeInstance === id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'bg-[#2C2C2E] text-gray-500 hover:text-gray-300 hover:bg-white/10'}
          `}
          title={`Instância ${id}`}
        >
          <Smartphone size={14} strokeWidth={activeInstance === id ? 2.5 : 2} />
          <span className="text-xs font-bold font-mono">{id}</span>
        </button>
      ))}

      {/* Add New Instance Button */}
      {instances.length < 5 && (
        <button
          onClick={onAdd}
          className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#2C2C2E] text-gray-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all"
          title="Nova Instância"
        >
          <Plus size={16} />
        </button>
      )}

    </div>
  );
}
