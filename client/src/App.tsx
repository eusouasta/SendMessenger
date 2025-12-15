import { useEffect, useState } from 'react';
import axios from 'axios';
import { Send, Zap } from 'lucide-react';
import InstanceTabs from './components/InstanceTabs';
import InstanceView from './components/InstanceView';

function App() {
  const [hasLicense, setHasLicense] = useState<boolean>(false);
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [loadingLicense, setLoadingLicense] = useState<boolean>(true);

  // Instance State
  const [activeInstance, setActiveInstance] = useState<string>('1');
  const [instances, setInstances] = useState<string[]>(['1']); // Start with only Instance 1

  // Handle Adding New Instance
  const handleAddInstance = () => {
    if (instances.length >= 5) return alert('Máximo de 5 instâncias atingido.');

    // Find next available ID
    for (let i = 1; i <= 5; i++) {
      const id = i.toString();
      if (!instances.includes(id)) {
        const newInstances = [...instances, id].sort(); // Keep sorted
        setInstances(newInstances);
        setActiveInstance(id); // Switch to new tab
        break;
      }
    }
  };

  // Theme
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Check License
  useEffect(() => {
    axios.get('http://localhost:3001/api/check-license')
      .then(res => {
        if (res.data.valid) {
          setHasLicense(true);
        }
        setLoadingLicense(false);
      })
      .catch(() => setLoadingLicense(false));
  }, []);

  const verifyLicense = async () => {
    if (!licenseKey.trim()) return alert('Digite a chave.');
    try {
      const res = await axios.post('http://localhost:3001/api/verify-license', { key: licenseKey });
      if (res.data.success) {
        setHasLicense(true);
        alert('Licença ativada com sucesso!');
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao verificar chave.');
    }
  };

  // LICENSE SCREEN
  if (!hasLicense && !loadingLicense) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 font-sans select-none">
        <div className="bg-[#1C1C1E] backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center space-y-8 border border-white/5 animate-fade-in">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30 ring-1 ring-black/5">
              <Send size={40} fill="currentColor" className="ml-1" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">SendMessenger Pro</h1>
              <p className="text-sm text-gray-400 font-medium">Ativação do Produto</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="text-left space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider font-bold text-gray-500 pl-1">Chave de Licença</label>
              <input
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-xl px-4 py-3.5 text-center text-base font-mono uppercase tracking-widest text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-gray-600"
                placeholder="XXXX-XXXX-XXXX"
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value)}
                spellCheck={false}
              />
            </div>
            <button
              onClick={verifyLicense}
              className="w-full bg-[#0071e3] hover:bg-[#0077ED] text-white font-semibold rounded-xl px-6 py-3.5 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <span>Ativar Licença</span>
              <Zap size={16} fill="currentColor" />
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Não tem uma chave? <a href="#" className="text-blue-500 hover:underline">Contate o suporte</a>.
          </p>
        </div>
      </div>
    )
  }

  // MAIN MULTI-INSTANCE UI
  return (
    <div className="h-screen w-screen bg-[#0A0A0A] flex flex-col overflow-hidden">
      {/* TAB BAR (Top) */}
      <div className="shrink-0 z-50">
        <InstanceTabs
          activeInstance={activeInstance}
          instances={instances}
          onSelect={setActiveInstance}
          onAdd={handleAddInstance}
        />
      </div>

      {/* INSTANCE VIEW HANDLER */}
      {/* We keep instances mounted but hidden to preserve state (logs, socket connection) */}
      <div className="flex-1 overflow-hidden relative">
        {instances.map(id => (
          <div
            key={id}
            className="w-full h-full"
            style={{ display: activeInstance === id ? 'block' : 'none' }}
          >
            <InstanceView instanceId={id} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
