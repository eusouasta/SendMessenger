import { Smartphone, Monitor, Plus, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

// Electron Import Helper
declare global {
  interface Window {
    require: any;
  }
}

const requireElectron = () => {
  if (window.require) {
    return window.require('electron');
  }
  return null;
};

interface InstanceTabsProps {
  activeInstance: string;
  instances: string[];
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export default function InstanceTabs({ activeInstance, instances, onSelect, onAdd }: InstanceTabsProps) {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const electron = requireElectron();
    if (!electron) return;
    const { ipcRenderer } = electron;

    const handleStatus = (_event: any, message: string) => {
      // Simple logic to stop spinning if it's not a progress message
      if (!message.includes('Download speed')) {
        setTimeout(() => setChecking(false), 2000);
      }

      // If update available or downloaded, notify user
      if (message.includes('Update available')) {
        alert('Nova atualização disponível! Baixando...');
      } else if (message.includes('Update downloaded')) {
        const resp = confirm('Atualização baixada! Deseja reiniciar agora para instalar?');
        if (resp) {
          ipcRenderer.send('restart_app');
        }
      } else if (message.includes('not available')) {
        alert('Você já está na versão mais recente!');
      }
    };

    ipcRenderer.on('update_status', handleStatus);
    return () => {
      ipcRenderer.removeListener('update_status', handleStatus);
    };
  }, []);

  const checkForUpdates = () => {
    const electron = requireElectron();
    if (electron) {
      setChecking(true);
      electron.ipcRenderer.send('check_for_updates');
    } else {
      alert('Funcionalidade disponível apenas no App Desktop.');
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 bg-[#1C1C1E] border-b border-white/5 h-14 w-full justify-between">

      <div className="flex items-center gap-2">
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

      {/* Update Button */}
      <button
        onClick={checkForUpdates}
        className={`h-9 px-3 rounded-lg flex items-center gap-2 text-xs font-medium transition-all 
            ${checking ? 'bg-orange-500/10 text-orange-500 animate-pulse' : 'bg-[#2C2C2E] text-gray-400 hover:text-white hover:bg-white/10'}
        `}
        title="Verificar Atualizações"
      >
        <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
        {checking ? 'Verificando...' : 'Atualizar App'}
      </button>

    </div>
  );
}
