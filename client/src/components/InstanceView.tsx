import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import FlowEditor from './flow/FlowEditor';
import axios from 'axios';
import { socket } from '../socket';
import {
    Send,
    Settings,
    Activity,
    CheckCircle,
    AlertCircle,
    Loader,
    Play,
    Zap,
    LogOut,
    StopCircle,
    History as HistoryIcon,
    Users,
    ChevronLeft,
    Bot,
    Plus,
    Trash2,
    Power
} from 'lucide-react';

// Types
interface Log {
    type: 'success' | 'error' | 'info' | 'done';
    status?: string;
    number?: string;
    message: string;
    timestamp: string;
}

interface Step {
    id: string;
    type: 'text' | 'media' | 'audio' | 'delay';
    content?: string;
    path?: string;
    ms?: number;
    caption?: string;
}

interface Group {
    id: string;
    name: string;
    participantsCount: number;
}

interface Participant {
    id: string;
    user: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
}

interface ChatbotRule {
    id: string;
    name: string;
    triggers: string[];
    steps: Step[];
    enabled: boolean;
    oncePerUser: boolean;
    createdAt: string;
}

interface InstanceViewProps {
    instanceId: string;
}

export default function InstanceView({ instanceId }: InstanceViewProps) {
    const [status, setStatus] = useState<'STOPPED' | 'STARTING' | 'QR_READY' | 'READY'>('STOPPED');
    const [qr, setQr] = useState<string>('');
    const [ready, setReady] = useState<boolean>(false);
    const [authenticated, setAuthenticated] = useState<boolean>(false);
    const [connectedUser, setConnectedUser] = useState<string>('');
    const [logs, setLogs] = useState<Log[]>([]);
    const [history, setHistory] = useState<Log[]>([]);
    const [activeTab, setActiveTab] = useState<string>('campaign');

    // Groups
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [groupParticipants, setGroupParticipants] = useState<Participant[]>([]);
    const [loadingParticipants, setLoadingParticipants] = useState<boolean>(false);

    // Chatbot
    const [chatbotRules, setChatbotRules] = useState<ChatbotRule[]>([]);
    const [isCreatingRule, setIsCreatingRule] = useState<boolean>(false);

    // Campaign
    const [numbersText, setNumbersText] = useState<string>('');
    const [steps, setSteps] = useState<Step[]>([{ id: '1', type: 'text', content: '' }]);
    const [minDelay, setMinDelay] = useState<number>(10);
    const [maxDelay, setMaxDelay] = useState<number>(30);
    const [intervalUnit] = useState<string>('seconds'); // Removed setter
    const [isSending, setIsSending] = useState<boolean>(false);

    const logsEndRef = useRef<HTMLDivElement>(null);

    // API Base
    const api = `http://localhost:3001/api/${instanceId}`;

    useEffect(() => {
        if (activeTab === 'campaign') logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs, activeTab]);

    // Local Storage Persistence for Campaign
    useEffect(() => {
        const key = `campaignData_${instanceId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.numbersText) setNumbersText(data.numbersText);
                if (data.steps) setSteps(data.steps);
                if (data.minDelay) setMinDelay(data.minDelay);
                if (data.maxDelay) setMaxDelay(data.maxDelay);
            } catch (e) { console.error('Error loading saved campaign', e); }
        }
    }, [instanceId]);

    useEffect(() => {
        const key = `campaignData_${instanceId}`;
        const data = { numbersText, steps, minDelay, maxDelay };
        localStorage.setItem(key, JSON.stringify(data));
    }, [numbersText, steps, minDelay, maxDelay, instanceId]);

    useEffect(() => {
        // Reset State when Instance Changes
        setReady(false);
        setAuthenticated(false);
        setConnectedUser('');
        setQr('');
        setLogs([]);
        setHistory([]);
        setGroups([]);
        setChatbotRules([]);
        setNumbersText('');
        setSelectedGroup(null);
        setIsSending(false);
        setStatus('STOPPED');

        // Initial Fetch
        fetchHistory();

        // Socket Logic
        socket.emit('join-instance', instanceId);

        const onStatusChange = (payload: any) => {
            if (payload?.instanceId !== instanceId) return;
            const newStatus = payload.data; // STOPPED, STARTING
            if (newStatus === 'STOPPED') {
                setStatus('STOPPED');
                setReady(false);
                setAuthenticated(false);
                setQr('');
            } else if (newStatus === 'STARTING') {
                setStatus('STARTING');
            }
        };

        const onQr = (payload: any) => {
            if (payload?.instanceId !== instanceId) return;
            setQr(payload.data);
            setStatus('QR_READY');
            setReady(false);
            setAuthenticated(false);
        };

        const onReady = (payload: any) => {
            if (payload?.instanceId !== instanceId) return;
            const data = payload.data;
            setStatus('READY');
            setReady(true);
            setAuthenticated(true);
            setQr('');
            if (data?.user) setConnectedUser(data.user);
        };

        const onAuth = (payload: any) => {
            if (payload?.instanceId !== instanceId) return;
            setStatus('READY');
            setAuthenticated(true);
            setQr('');
        };

        const onLog = (payload: any) => {
            if (payload?.instanceId !== instanceId) return;
            const log = payload.data;
            // Limit to last 100 logs for performance
            setLogs(prev => {
                const newLogs = [...prev, log];
                if (newLogs.length > 100) return newLogs.slice(newLogs.length - 100);
                return newLogs;
            });
            if (log.type === 'success' || log.type === 'error') {
                setHistory(prev => [...prev, log]);
            }
        };

        const onDone = (payload: any) => {
            if (payload?.instanceId !== instanceId) return;
            setIsSending(false);
            alert('Campanha finalizada (ou interrompida).');
            fetchHistory();
        };

        socket.on('status_change', onStatusChange);
        socket.on('qr', onQr);
        socket.on('ready', onReady);
        socket.on('authenticated', onAuth);
        socket.on('log', onLog);
        socket.on('done', onDone);

        return () => {
            socket.off('status_change', onStatusChange);
            socket.off('qr', onQr);
            socket.off('ready', onReady);
            socket.off('authenticated', onAuth);
            socket.off('log', onLog);
            socket.off('done', onDone);
            socket.emit('leave-instance', instanceId);
        };
    }, [instanceId]);

    // Data Fetching
    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${api}/history`);
            setHistory(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchGroups = async () => {
        // setLoadingGroups(true); // Removed unused
        try {
            const res = await axios.get(`${api}/groups`);
            setGroups(res.data);
        } catch (e: any) {
            alert('Erro ao carregar grupos: ' + (e.response?.data?.error || e.message));
        } finally {
            // setLoadingGroups(false);
        }
    };

    const fetchChatbotRules = async () => {
        try {
            const response = await axios.get(`${api}/chatbot/rules`);
            setChatbotRules(response.data);
        } catch (error) { console.error('Error fetching rules', error); }
    };

    useEffect(() => {
        if (activeTab === 'groups') fetchGroups();
        if (activeTab === 'chatbot') fetchChatbotRules();
    }, [activeTab, instanceId]);

    // Actions
    const deleteRule = async (id: string) => {
        if (!confirm('Deletar esta regra?')) return;
        try {
            await axios.delete(`${api}/chatbot/rules/${id}`);
            fetchChatbotRules();
        } catch (e) { alert('Erro ao deletar regra'); }
    };

    const toggleRuleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await axios.put(`${api}/chatbot/rules/${id}`, { enabled: !currentStatus });
            // Optimistic update
            setChatbotRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !currentStatus } : r));
        } catch (e) {
            console.error(e);
            alert('Erro ao atualizar status da regra');
            fetchChatbotRules(); // Revert on error
        }
    };

    const handleCreateRule = () => {
        setSteps([{ id: '1', type: 'text', content: '' }]);
        setIsCreatingRule(true);
        setActiveTab('builder');
    };

    const handleExtractGroup = async (group: Group) => {
        setSelectedGroup(group);
        setLoadingParticipants(true);
        setGroupParticipants([]);
        try {
            const res = await axios.get(`${api}/groups/${group.id}/participants`);
            setGroupParticipants(res.data);
        } catch (e: any) {
            alert('Erro ao extrair participantes: ' + (e.response?.data?.error || e.message));
            setSelectedGroup(null);
        } finally {
            setLoadingParticipants(false);
        }
    };

    const handleAddToList = () => {
        if (!groupParticipants.length) return;
        const newNumbers = groupParticipants.map(p => p.user).join('\n');
        setNumbersText(prev => (prev ? prev + '\n' : '') + newNumbers);
        alert(`${groupParticipants.length} números adicionados à lista.`);
    };

    const handleExportCSV = () => {
        if (!groupParticipants.length) return;
        const csvContent = "data:text/csv;charset=utf-8,Numero,Admin\n"
            + groupParticipants.map(p => `${p.user},${p.isAdmin ? 'Sim' : 'Não'}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `participantes_${selectedGroup?.name.replace(/[^a-z0-9]/gi, '_') || 'grupo'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSend = async () => {
        if (!numbersText.trim()) return alert('Por favor, adicione números.');
        if (steps.length === 0) return alert('Adicione pelo menos um passo de envio.');

        // Simple Validation
        for (const s of steps) {
            if (s.type === 'text' && !s.content?.trim()) return alert('Preencha o conteúdo do texto.');
            if ((s.type === 'media' || s.type === 'audio') && !s.path) return alert(`Selecione o arquivo para o passo de ${s.type}.`);
        }

        const numbers = numbersText.split('\n').map(n => n.trim()).filter(n => n.length > 0);
        if (numbers.length === 0) return alert('Nenhum número válido encontrado.');

        const unitLabel = intervalUnit === 'seconds' ? 'segundos' : intervalUnit === 'minutes' ? 'minutos' : 'horas';
        if (!window.confirm(`Iniciar envio para ${numbers.length} contatos com ${steps.length} passos?\nIntervalo: ${minDelay}-${maxDelay} ${unitLabel}.`)) return;

        setIsSending(true);
        setLogs([]);
        try {
            await axios.post(`${api}/send`, {
                numbers, steps, minDelay, maxDelay, intervalUnit
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
        try { await axios.post(`${api}/stop`); } catch (e) { alert('Erro ao parar.'); }
    };

    const handleLogout = async () => {
        if (!window.confirm('Tem certeza que deseja desconectar?')) return;
        try { await axios.post(`${api}/logout`); } catch (e) { console.error('Logout error:', e); }
        setConnectedUser('');
        setReady(false);
        setQr('');
        setAuthenticated(false);
        setLogs([]);
    };

    const handleFlowSave = async (newSteps: Step[], extraData?: any) => {
        if (isCreatingRule) {
            try {
                await axios.post(`${api}/chatbot/rules`, {
                    name: extraData?.name || 'Nova Regra',
                    triggers: extraData?.triggers || [],
                    enabled: true,
                    oncePerUser: extraData?.oncePerUser || false,
                    steps: newSteps
                });
                alert('Regra criada com sucesso!');
                setIsCreatingRule(false);
                setActiveTab('chatbot');
            } catch (e: any) {
                alert('Erro ao salvar regra: ' + e.message);
            }
        } else {
            setSteps(newSteps);
            alert('Fluxo salvo com sucesso! Você pode iniciar o envio na aba Campanha.');
            setActiveTab('campaign');
        }
    };

    const handleInitInstance = async () => {
        try {
            await axios.post(`${api}/init`);
            setStatus('STARTING');
        } catch (e: any) {
            alert('Erro ao iniciar: ' + (e.response?.data?.error || e.message));
        }
    };

    // View Builder
    if (activeTab === 'builder') {
        return (
            <div className="h-full w-full flex flex-col bg-[#0A0A0A]">
                <FlowEditor
                    initialSteps={steps}
                    onSave={handleFlowSave}
                    onBack={() => {
                        setIsCreatingRule(false);
                        setActiveTab(isCreatingRule ? 'chatbot' : 'campaign');
                    }}
                    isRuleMode={isCreatingRule}
                />
            </div>
        );
    }

    // Debug QR
    // console.log('Current QR State:', qr);

    // Main UI - SPACIOUS LAYOUT
    return (
        <div className="flex w-full h-full overflow-hidden bg-[#0A0A0A]">

            {/* 1. LEFT RAIL (Navigation) */}
            <div className="w-20 bg-[#1C1C1E] border-r border-white/5 flex flex-col items-center py-4 gap-4 shrink-0">
                <div className={`w-3 h-3 rounded-full mb-4 ${ready ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} title={ready ? "Online" : "Offline"} />

                {[
                    { id: 'campaign', icon: Send, label: 'Enviar' },
                    { id: 'history', icon: HistoryIcon, label: 'Histórico' },
                    { id: 'groups', icon: Users, label: 'Grupos' },
                    { id: 'chatbot', icon: Bot, label: 'Bot' },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                        title={item.label}
                    >
                        <item.icon size={20} className={activeTab === item.id ? 'animate-pulse_stop' : ''} />
                    </button>
                ))}

                <div className="mt-auto">
                    {(connectedUser || ready || authenticated) && (
                        <button onClick={handleLogout} className="w-12 h-12 rounded-xl bg-red-900/20 text-red-400 flex items-center justify-center hover:bg-red-900/40" title="Sair / Desconectar">
                            <LogOut size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* 2. MAIN CONTENT (Center) */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0A]">

                {/* Header Title */}
                <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur">
                    <h2 className="text-lg font-bold text-white capitalize flex items-center gap-2">
                        {activeTab === 'campaign' && <><Send size={18} className="text-blue-500" /> Campanha de Envio</>}
                        {activeTab === 'history' && <><HistoryIcon size={18} className="text-green-500" /> Histórico de Envios</>}
                        {activeTab === 'groups' && <><Users size={18} className="text-yellow-500" /> Gerenciamento de Grupos</>}
                        {activeTab === 'chatbot' && <><Bot size={18} className="text-cyan-500" /> Automação (Chatbot)</>}
                    </h2>
                    {activeTab === 'campaign' && connectedUser && (
                        <div className="text-xs font-mono text-gray-500 bg-[#1C1C1E] px-3 py-1 rounded-full border border-white/5">
                            +{connectedUser.split('@')[0]}
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">

                    {/* CAMPAIGN CONTENT */}
                    {activeTab === 'campaign' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

                            {/* Connection State */}

                            {/* Connection State */}
                            {status === 'STOPPED' && (
                                <div className="flex flex-col items-center justify-center p-8 bg-[#1C1C1E] rounded-2xl border border-white/5 shadow-2xl">
                                    <h3 className="text-xl font-bold text-white mb-6">Instância Parada</h3>
                                    <div className="p-4 bg-white/5 rounded-xl shadow-inner border border-white/10 w-[280px] h-[280px] flex items-center justify-center flex-col gap-4">
                                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2">
                                            <Power size={32} className="text-gray-400" />
                                        </div>
                                        <p className="text-gray-400 text-center text-sm px-4">Esta instância está desligada para economizar recursos.</p>
                                        <button
                                            onClick={handleInitInstance}
                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg transition-all active:scale-95"
                                        >
                                            Iniciar Instância
                                        </button>
                                    </div>
                                </div>
                            )}

                            {status === 'STARTING' && (
                                <div className="flex flex-col items-center justify-center p-8 bg-[#1C1C1E] rounded-2xl border border-white/5 shadow-2xl">
                                    <h3 className="text-xl font-bold text-white mb-6">Iniciando...</h3>
                                    <div className="p-4 bg-white/5 rounded-xl shadow-inner border border-white/10 w-[280px] h-[280px] flex items-center justify-center">
                                        <Loader size={48} className="animate-spin text-blue-500" />
                                    </div>
                                    <p className="text-gray-500 mt-6 text-sm">Aguarde, carregando WhatsApp...</p>
                                </div>
                            )}

                            {status === 'QR_READY' && (
                                <div className="flex flex-col items-center justify-center p-8 bg-[#1C1C1E] rounded-2xl border border-white/5 shadow-2xl">
                                    <h3 className="text-xl font-bold text-white mb-6">Conectar WhatsApp</h3>
                                    <div className="p-4 bg-white rounded-xl shadow-inner border border-gray-200">
                                        {qr ? (
                                            <QRCodeSVG value={qr} size={280} />
                                        ) : (
                                            <div className="w-[280px] h-[280px] flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg">
                                                <div className="flex flex-col items-center animate-pulse">
                                                    <Loader size={32} className="animate-spin mb-2" />
                                                    <span>Carregando QR...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-gray-500 mt-6 text-sm">Abra o WhatsApp {'>'} Aparelhos Conectados {'>'} Conectar Aparelho</p>
                                </div>
                            )}

                            {/* Campaign Controls (Visible even if not ready, but disabled) */}
                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${(!ready && !authenticated) ? 'opacity-70' : ''}`}>

                                {/* Left Column: List */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Lista de Contatos</label>
                                        <div className="text-xs bg-blue-900/40 text-blue-300 px-2 py-1 rounded border border-blue-500/20">
                                            {numbersText.split('\n').filter(Boolean).length} destinatários
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full h-[400px] bg-[#1C1C1E] border border-white/10 rounded-xl p-4 text-sm font-mono text-gray-300 focus:outline-none focus:border-blue-500/50 transition-colors resize-none shadow-inner"
                                        placeholder={`5511999999999\n5511888888888\n...`}
                                        value={numbersText}
                                        onChange={e => setNumbersText(e.target.value)}
                                    />
                                </div>

                                {/* Right Column: Config */}
                                <div className="space-y-6">

                                    {/* Message Config */}
                                    <div className="bg-[#1C1C1E] rounded-xl border border-white/5 p-5 shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />
                                        <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2"><Settings size={16} /> Configuração da Mensagem</h3>

                                        <div className="space-y-3 mb-6">
                                            {Math.random() > 2 ? null : ( // Just to break render? No, let's just render steps
                                                steps.map((s, i) => (
                                                    <div key={i} className="bg-[#0A0A0A] p-2 rounded border border-white/5 flex items-center gap-3 text-xs text-gray-400">
                                                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-mono">{i + 1}</div>
                                                        <span className="uppercase font-bold text-gray-300">{s.type}</span>
                                                        {s.type === 'text' && <span className="truncate max-w-[150px] italic">"{s.content?.substring(0, 20)}..."</span>}
                                                        {s.type === 'delay' && <span>{s.ms}ms</span>}
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <button onClick={() => setActiveTab('builder')} className="w-full py-3 bg-[#2C2C2E] hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-blue-400 transition-colors">
                                            Editar Fluxo de Mensagem
                                        </button>
                                    </div>

                                    {/* Delay Config */}
                                    <div className="bg-[#1C1C1E] rounded-xl border border-white/5 p-5 shadow-lg">
                                        <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2"><Activity size={16} /> Intervalo (Anti-Ban)</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Mínimo (s)</label>
                                                <input type="number" className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg p-2.5 text-center text-gray-200"
                                                    value={minDelay} onChange={e => setMinDelay(Number(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Máximo (s)</label>
                                                <input type="number" className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg p-2.5 text-center text-gray-200"
                                                    value={maxDelay} onChange={e => setMaxDelay(Number(e.target.value))} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <button
                                        onClick={isSending ? handleStop : handleSend}
                                        disabled={(!ready && !authenticated && !isSending)}
                                        className={`w-full py-4 rounded-xl font-bold text-base shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isSending
                                            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                                            : (!ready && !authenticated)
                                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed hidden-while-loading' // Keep it simple
                                                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white'
                                            }`}
                                    >
                                        {isSending ? <><StopCircle size={20} /> PARAR ENVIO</> : <><Play size={20} fill="currentColor" /> INICIAR CAMPANHA</>}
                                    </button>

                                </div>
                            </div>
                        </div>
                    )}

                    {/* CHATBOT CONTENT */}
                    {activeTab === 'chatbot' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="flex justify-between items-center bg-[#1C1C1E] p-6 rounded-2xl border border-white/5">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Regras de Automação</h3>
                                    <p className="text-sm text-gray-500">Configure respostas automáticas para palavras-chave.</p>
                                </div>
                                <button onClick={handleCreateRule} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-900/20 flex items-center gap-2">
                                    <Plus size={18} /> Nova Regra
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {chatbotRules.length === 0 && <div className="text-center py-20 text-gray-500 bg-[#1C1C1E]/50 rounded-2xl border border-white/5 border-dashed">Nenhuma regra criada.</div>}
                                {chatbotRules.map(rule => (
                                    <div key={rule.id} className={`p-6 bg-[#1C1C1E] border border-white/5 rounded-2xl flex justify-between items-start group hover:border-white/10 transition-colors ${!rule.enabled ? 'opacity-60 grayscale' : ''}`}>
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="text-lg font-bold text-white">{rule.name}</div>
                                                {rule.oncePerUser && (
                                                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 uppercase tracking-widest font-bold">1 Vez/User</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {rule.triggers.map((t, i) => (
                                                    <span key={i} className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-xs font-mono border border-white/5">{t}</span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Toggle Enabled */}
                                            <label className="flex items-center cursor-pointer select-none gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                                                <div className="relative">
                                                    <input type="checkbox" className="sr-only" checked={rule.enabled !== false} onChange={() => toggleRuleStatus(rule.id, rule.enabled !== false)} />
                                                    <div className={`block w-10 h-6 rounded-full transition-colors ${rule.enabled !== false ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${rule.enabled !== false ? 'translate-x-4' : ''}`}></div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-400">{rule.enabled !== false ? 'ATIVO' : 'PAUSA'}</span>
                                            </label>

                                            <button onClick={() => deleteRule(rule.id)} className="p-3 bg-red-900/10 text-red-500 hover:bg-red-900/30 rounded-xl transition-colors" title="Deletar Regra"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GROUPS CONTENT */}
                    {activeTab === 'groups' && (
                        <div className="max-w-5xl mx-auto space-y-6">
                            {/* ... (Existing Groups Logic Adapted to Spacious) */}
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-400 uppercase tracking-wider">Grupos Encontrados</h3>
                                <button onClick={fetchGroups} className="text-blue-400 font-bold hover:underline">Atualizar Lista</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groups.map(g => (
                                    <div key={g.id} className="bg-[#1C1C1E] p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors group relative overflow-hidden">
                                        <div className="relative z-10">
                                            <h4 className="font-bold text-white truncate mb-1">{g.name}</h4>
                                            <p className="text-xs text-gray-500 mb-4">{g.participantsCount} participantes</p>
                                            <button onClick={() => handleExtractGroup(g)} className="w-full py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all">
                                                Extrair Contatos
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Participants Modal (Keep specific logic from previous but center it better) */}
                            {selectedGroup && (
                                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10">
                                    <div className="bg-[#1C1C1E] w-full max-w-2xl max-h-full rounded-2xl flex flex-col border border-white/10 shadow-2xl">
                                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                            <h3 className="text-xl font-bold text-white">{selectedGroup.name}</h3>
                                            <button onClick={() => setSelectedGroup(null)}><ChevronLeft className="text-gray-500 hover:text-white" /></button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#0A0A0A]">
                                            {loadingParticipants ? (
                                                <div className="py-20 flex justify-center"><Loader className="animate-spin text-blue-500" size={32} /></div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {groupParticipants.map(p => (
                                                        <div key={p.id} className="flex justify-between items-center bg-[#1C1C1E] p-2 rounded border border-white/5">
                                                            <span className="font-mono text-xs text-gray-400">+{p.user}</span>
                                                            {p.isAdmin && <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20">ADMIN</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 border-t border-white/5 flex gap-3">
                                            <button onClick={handleExportCSV} className="flex-1 bg-[#2C2C2E] text-white font-bold py-3 rounded-xl hover:bg-[#3a3a3c]">Download CSV</button>
                                            <button onClick={() => { handleAddToList(); setSelectedGroup(null); setActiveTab('campaign'); }} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500">Adicionar à Campanha</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* HISTORY CONTENT */}
                    {activeTab === 'history' && (
                        <div className="max-w-4xl mx-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-white text-xl">Histórico Completo</h3>
                                <button onClick={fetchHistory} className="text-sm bg-[#1C1C1E] border border-white/10 px-4 py-2 rounded-lg hover:bg-white/5">Atualizar</button>
                            </div>
                            <div className="space-y-2">
                                {history.slice().reverse().map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-[#1C1C1E] rounded-xl border border-white/5">
                                        {item.status === 'success' || item.type === 'success' ? <CheckCircle className="text-green-500 shrink-0" /> : <AlertCircle className="text-red-500 shrink-0" />}
                                        <div className="flex-1">
                                            <div className="font-mono text-base text-white">{item.number || 'Sistema'}</div>
                                            <div className="text-sm text-gray-500">{item.message}</div>
                                        </div>
                                        <div className="text-xs text-gray-600 font-mono text-right">
                                            {new Date(item.timestamp).toLocaleDateString()}<br />
                                            {new Date(item.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* 3. RIGHT RAIL (LOGS) - Collapsible or Fixed Width */}
            <div className="w-80 bg-[#050505] border-l border-white/5 flex flex-col shrink-0">
                <div className="p-4 border-b border-white/5 bg-[#1C1C1E]/50">
                    <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                        <Activity size={12} /> Console em Tempo Real
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {logs.length === 0 && (
                        <div className="text-center py-20 opacity-20">
                            <Zap size={40} className="mx-auto mb-2 text-white" />
                            <p className="text-xs text-white">Aguardando atividade...</p>
                        </div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className="text-xs font-mono space-y-1 border-b border-white/5 pb-2 last:border-0">
                            <div className="flex items-center justify-between opacity-50 text-[10px]">
                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                <span className={`px-1.5 rounded ${log.type === 'success' ? 'bg-green-500/20 text-green-400' :
                                    log.type === 'error' ? 'bg-red-500/20 text-red-400' :
                                        'bg-blue-500/20 text-blue-400'
                                    }`}>{log.type}</span>
                            </div>
                            <div className="text-gray-300 break-all">{log.message}</div>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>

        </div>
    );
}
