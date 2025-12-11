import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import {
  Send,
  Settings,
  Activity,
  CheckCircle,
  AlertCircle,
  Loader,
  Play,
  Zap,
  Phone,
  MessageSquare,
  LogOut,
  StopCircle,
  History
} from 'lucide-react';

// Types
interface Log {
  type: 'success' | 'error' | 'info' | 'done';
  number?: string;
  message: string;
  timestamp: string;
}

const socket: Socket = io('http://localhost:3001');

function App() {
  const [qr, setQr] = useState<string>('');
  const [ready, setReady] = useState<boolean>(false);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [connectedUser, setConnectedUser] = useState<string>('');
  const [logs, setLogs] = useState<Log[]>([]);
  const [history, setHistory] = useState<Log[]>([]);

  // View State: 'campaign' or 'history'
  const [activeTab, setActiveTab] = useState<'campaign' | 'history'>('campaign');

  // License State
  const [hasLicense, setHasLicense] = useState<boolean>(false);
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [loadingLicense, setLoadingLicense] = useState<boolean>(true);

  // Theme State (Forced Dark)
  // Toggle Dark Mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  const [numbersText, setNumbersText] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [minDelay, setMinDelay] = useState<number>(10);
  const [maxDelay, setMaxDelay] = useState<number>(30);
  const [intervalUnit, setIntervalUnit] = useState<string>('seconds');
  const [isSending, setIsSending] = useState<boolean>(false);

  const logsEndRef = useRef<HTMLDivElement>(null);



  // Scroll logs
  useEffect(() => {
    if (activeTab === 'campaign') logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, activeTab]);

  useEffect(() => {
    // Check License First
    axios.get('http://localhost:3001/api/check-license')
      .then(res => {
        if (res.data.valid) {
          setHasLicense(true);
        }
        setLoadingLicense(false);
      })
      .catch(() => setLoadingLicense(false));

    // Load History on mount
    fetchHistory();

    socket.on('connect', () => { console.log('Connected'); });
    socket.on('qr', (data) => { setQr(data); setReady(false); setAuthenticated(false); });
    socket.on('ready', (data) => {
      setReady(true);
      setAuthenticated(true);
      setQr('');
      if (data?.user) setConnectedUser(data.user);
    });
    socket.on('authenticated', () => { setAuthenticated(true); setQr(''); });

    // Log Handler
    socket.on('log', (log: Log) => {
      setLogs(prev => [...prev, log]);
      if (log.type === 'success' || log.type === 'error') {
        // Update history locally too or just re-fetch
        setHistory(prev => [...prev, log]);
      }
    });

    // Done Handler
    socket.on('done', () => {
      setIsSending(false);
      alert('Campanha finalizada (ou interrompida).');
      fetchHistory(); // Refresh full history
    });

    return () => {
      socket.off('qr');
      socket.off('ready');
      socket.off('authenticated');
      socket.off('log');
      socket.off('done');
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/history');
      setHistory(res.data);
    } catch (e) { console.error(e); }
  };

  const handleSend = async () => {
    if (!numbersText.trim() || !message.trim()) return alert('Por favor, preencha todos os campos.');
    const numbers = numbersText.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (numbers.length === 0) return alert('Nenhum número válido encontrado.');

    const unitLabel = intervalUnit === 'seconds' ? 'segundos' : intervalUnit === 'minutes' ? 'minutos' : 'horas';
    if (!window.confirm(`Iniciar envio para ${numbers.length} contatos?\nIntervalo de ${minDelay} a ${maxDelay} ${unitLabel}.`)) return;

    setIsSending(true);
    setLogs([]); // Clear current logs
    try {
      await axios.post('http://localhost:3001/api/send', {
        numbers,
        message,
        minDelay,
        maxDelay,
        intervalUnit
      });
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || 'Erro desconhecido';
      alert(`Falha ao iniciar: ${errMsg}`);
      setIsSending(false);
    }
  };

  const handleStop = async () => {
    if (!window.confirm('Deseja realmente PARAR a campanha atual?')) return;
    try {
      await axios.post('http://localhost:3001/api/stop');
    } catch (e) {
      alert('Erro ao parar.');
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar?')) return;
    try {
      await axios.post('http://localhost:3001/api/logout');
      window.location.reload();
    } catch (e) {
      alert('Erro ao desconectar');
    }
  };

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

  if (!hasLicense && !loadingLicense) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 font-sans select-none">
        <div className="bg-[#1C1C1E] backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center space-y-8 border border-white/5 animate-fade-in">

          {/* Logo Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30 ring-1 ring-black/5">
              <Send size={40} fill="currentColor" className="ml-1" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">SendMessenger Pro</h1>
              <p className="text-sm text-gray-400 font-medium">Ativação do Produto</p>
            </div>
          </div>

          {/* Form Section */}
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] transition-colors duration-300 flex items-center justify-center p-4 lg:p-8 font-sans text-gray-100">

      {/* Main Window */}
      <div className="w-full max-w-6xl bg-[#1C1C1E] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/5" style={{ height: '85vh', maxHeight: '900px' }}>

        {/* SIDEBAR (Controls) */}
        <div className="w-full md:w-[420px] bg-[#1C1C1E] border-r border-white/5 flex flex-col h-full shrink-0">

          {/* Header */}
          <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-[#1C1C1E]/80 backdrop-blur-md sticky top-0 z-10 w-full">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Send size={16} fill="currentColor" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">SendPro</span>
            </div>

            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1 ${ready ? 'bg-green-900/20 text-green-400 border-green-900/50' : 'bg-rose-900/20 text-rose-400 border-rose-900/50'}`}>
                {ready ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">

            {!ready && !authenticated ? (
              <div className="flex flex-col items-center justify-center h-full py-10 space-y-6">
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
                  {qr ? <QRCodeSVG value={qr} size={220} /> : <div className="w-[220px] h-[220px] bg-slate-100 animate-pulse rounded-xl" />}
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-semibold text-gray-200">Conectar WhatsApp</h3>
                  <p className="text-sm text-gray-400">Abra o whatsApp {'>'} Aparelhos Conectados {'>'} Conectar</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">

                {connectedUser && (
                  <div className="p-3 bg-blue-900/20 border border-blue-900/30 rounded-lg flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-blue-400">Conectado como</span>
                      <span className="text-xs font-mono text-blue-300">+{connectedUser.split('@')[0]}</span>
                    </div>
                    <button onClick={handleLogout} className="p-2 hover:bg-red-900/30 rounded text-red-400 transition-colors" title="Sair">
                      <LogOut size={16} />
                    </button>
                  </div>
                )}

                {/* Input Fields (Only show if not sending, or read-only if sending) */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex justify-between items-center">
                      <span className="flex items-center gap-1"><Phone size={12} /> Lista de Contatos</span>
                      <span className="bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">{numbersText.split('\n').filter(Boolean).length}</span>
                    </label>
                    <textarea
                      className="w-full h-32 apple-input font-mono text-xs leading-relaxed resize-none bg-[#2C2C2E] border-white/5 text-gray-200"
                      placeholder={`5511999999999\n+55 (11) 98888-8888`}
                      value={numbersText}
                      onChange={e => setNumbersText(e.target.value)}
                      disabled={isSending}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1"><MessageSquare size={12} /> Mensagem</label>
                    <textarea
                      className="w-full h-32 apple-input text-sm leading-relaxed resize-none bg-[#2C2C2E] border-white/5 text-gray-200"
                      placeholder="Olá, tudo bem?"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      disabled={isSending}
                    />
                  </div>

                  {/* Delays */}
                  <div className="bg-[#2C2C2E]/50 rounded-xl border border-white/5 p-4 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Settings size={14} className="text-gray-500" />
                      <span className="text-sm font-semibold text-gray-300">Intervalo de Segurança</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">Unidade</label>
                        <select className="w-full apple-input py-2 bg-[#2C2C2E] border-white/5 text-gray-200"
                          value={intervalUnit} onChange={e => setIntervalUnit(e.target.value)} disabled={isSending}>
                          <option value="seconds">Segundos</option>
                          <option value="minutes">Minutos</option>
                          <option value="hours">Horas</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-semibold uppercase">Min</span>
                        <input type="number" className="w-full mt-1 apple-input py-2 text-center bg-[#2C2C2E] border-white/5 text-gray-200"
                          value={minDelay} onChange={e => setMinDelay(Number(e.target.value))} disabled={isSending} />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-semibold uppercase">Max</span>
                        <input type="number" className="w-full mt-1 apple-input py-2 text-center bg-[#2C2C2E] border-white/5 text-gray-200"
                          value={maxDelay} onChange={e => setMaxDelay(Number(e.target.value))} disabled={isSending} />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-6 border-t border-white/5 bg-[#1C1C1E]">
            {!isSending ? (
              <button
                onClick={handleSend}
                disabled={!ready && !authenticated}
                className="w-full apple-button flex items-center justify-center gap-2"
              >
                <Play size={18} fill="currentColor" />
                <span>Iniciar Campanha</span>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="w-full apple-button bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2"
              >
                <StopCircle size={18} fill="currentColor" />
                <span>PARAR CAMPANHA</span>
              </button>
            )}
          </div>
        </div>

        {/* MAIN DISPLAY (Tabs) */}
        <div className="flex-1 bg-[#000000]/20 flex flex-col min-h-[400px] relative">

          {/* Tab Header */}
          <div className="h-16 px-6 border-b border-white/5 flex items-center gap-4 bg-[#1C1C1E]/80 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('campaign')}
              className={`pb-0 h-full flex items-center gap-2 border-b-2 px-2 transition-colors ${activeTab === 'campaign' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Activity size={18} />
              <span className="font-medium">Atividade</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`pb-0 h-full flex items-center gap-2 border-b-2 px-2 transition-colors ${activeTab === 'history' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <History size={18} />
              <span className="font-medium">Histórico</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-3 bg-[#000000]/20 custom-scrollbar relative">

            {/* CAMPAIGN VIEW */}
            {activeTab === 'campaign' && (
              <>
                {logs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 select-none">
                    <Zap size={64} strokeWidth={1} className="mb-4 text-gray-700" />
                    <p className="font-medium text-gray-500">Aguardando início...</p>
                  </div>
                )}
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-4 p-3 rounded-lg hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-600">
                    {/* Log Item Render */}
                    <div className="pt-0.5">
                      {log.type === 'success' && <CheckCircle size={16} className="text-green-500" />}
                      {log.type === 'error' && <AlertCircle size={16} className="text-red-500" />}
                      {log.type === 'info' && <Loader size={16} className="text-blue-400 animate-spin" />}
                      {log.type === 'done' && <CheckCircle size={16} className="text-indigo-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className={`text-sm font-medium ${log.type === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                          {log.message}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {log.number && <div className="text-xs text-gray-500 font-mono tracking-wide">{log.number}</div>}
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </>
            )}

            {/* HISTORY VIEW */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold uppercase text-gray-400">Total Enviados: {history.length}</h3>
                  <button onClick={() => fetchHistory()} className="text-xs text-blue-500 hover:underline">Atualizar</button>
                </div>

                {history.slice().reverse().map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#1C1C1E] rounded-lg shadow-sm border border-white/5">
                    <div className="flex items-center gap-3">
                      {item.type === 'success' ? <CheckCircle size={16} className="text-green-500" /> : <AlertCircle size={16} className="text-red-500" />}
                      <div>
                        <div className="font-mono text-sm text-gray-200">{item.number || 'Sistema'}</div>
                        <div className="text-xs text-gray-400">{item.message}</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
                {history.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum histórico encontrado.</p>}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  )
}

export default App
