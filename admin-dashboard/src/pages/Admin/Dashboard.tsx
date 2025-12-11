import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import {
    Users, Key, LogOut, Plus, Trash2, Search, ShieldCheck, FileUp, Archive,
    PauseCircle, PlayCircle, DollarSign, Activity, Terminal, ExternalLink, RefreshCw
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface License {
    id: number;
    key_string: string;
    status: 'active' | 'unused' | 'paused';
    created_at: string;
    user_email?: string;
    reserved_email?: string;
}

interface AppVersion {
    id: number;
    version: string;
    filename: string;
    created_at: string;
    active: boolean;
    storage_path: string;
}

interface WebhookLog {
    id: string;
    payload: any;
    source: string;
    status: string;
    created_at: string;
}

export default function AdminDashboard({ onLogout }: { session: any | null, onLogout: () => void }) {
    const [activeView, setActiveView] = useState<'sales' | 'keys' | 'downloads' | 'webhooks'>('sales');
    const [licenses, setLicenses] = useState<License[]>([]);
    const [versions, setVersions] = useState<AppVersion[]>([]);
    const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Stats
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalSales, setTotalSales] = useState(0);
    const [salesData, setSalesData] = useState<any[]>([]);

    // Upload State
    const [uploading, setUploading] = useState(false);
    const [uploadVersion, setUploadVersion] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [useExternalLink, setUseExternalLink] = useState(false);
    const [externalLink, setExternalLink] = useState('');

    // Webhook Test State
    const [testLoading, setTestLoading] = useState(false);
    const [testEmail, setTestEmail] = useState('teste@cakto-sim.com');

    useEffect(() => {
        if (activeView === 'keys' || activeView === 'sales') fetchLicenses();
        if (activeView === 'downloads') fetchVersions();
        if (activeView === 'webhooks') fetchWebhooks();
    }, [activeView]);

    useEffect(() => {
        if (licenses.length > 0) calculateSales();
    }, [licenses]);

    const fetchLicenses = async () => {
        const { data, error } = await supabase
            .from('admin_licenses_view')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setLicenses(data as License[]);
        }
    };

    const calculateSales = () => {
        // Assume every license created (or maybe active/reserved) counts as a sale?
        // Let's filter by those that have an owner (reserved_email or user_email) or are active.
        // Or simply all licenses equals sales? Let's assume all valid licenses are sales.
        const soldLicenses = licenses.filter(l => l.reserved_email || l.user_email || l.status === 'active');

        const count = soldLicenses.length;
        const revenue = count * 49.90;

        setTotalSales(count);
        setTotalRevenue(revenue);

        // Group by Date for Chart
        const grouped: Record<string, number> = {};
        soldLicenses.forEach(l => {
            const date = new Date(l.created_at).toLocaleDateString('pt-BR');
            grouped[date] = (grouped[date] || 0) + 49.90;
        });

        const chartData = Object.keys(grouped).map(date => ({
            name: date,
            revenue: grouped[date]
        })).reverse(); // Show oldest to newest? Map keys are random order. 
        // Better sort by date
        chartData.sort((a, b) => {
            const da = a.name.split('/').reverse().join('-');
            const db = b.name.split('/').reverse().join('-');
            return da.localeCompare(db);
        });

        setSalesData(chartData);
    };

    const fetchVersions = async () => {
        const { data } = await supabase.from('app_versions').select('*').order('created_at', { ascending: false });
        if (data) setVersions(data as AppVersion[]);
    };

    const fetchWebhooks = async () => {
        const { data } = await supabase.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(50);
        if (data) setWebhookLogs(data as WebhookLog[]);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();

        let pathOrUrl = '';
        let fileNameToSave = '';

        setUploading(true);

        if (useExternalLink) {
            if (!externalLink) { alert('Informe o link!'); setUploading(false); return; }
            pathOrUrl = externalLink;
            fileNameToSave = 'Link Externo';
        } else {
            if (!uploadFile) { alert('Selecione um arquivo!'); setUploading(false); return; }

            const fileName = `${Date.now()}_${uploadFile.name}`;
            fileNameToSave = uploadFile.name;

            // 1. Upload to Storage
            const { error: storageError } = await supabase.storage
                .from('installers')
                .upload(fileName, uploadFile);

            if (storageError) {
                alert('Erro no Upload: ' + storageError.message);
                setUploading(false);
                return;
            }
            pathOrUrl = fileName;
        }

        // 2. Insert Record
        const { error: dbError } = await supabase.from('app_versions').insert({
            version: uploadVersion,
            filename: fileNameToSave,
            storage_path: pathOrUrl,
            active: true
        });

        if (dbError) {
            alert('Erro ao salvar versão: ' + dbError.message);
        } else {
            alert('Upload Concluído!');
            setUploadFile(null);
            setUploadVersion('');
            setExternalLink('');
            setUseExternalLink(false);
            fetchVersions();
        }
        setUploading(false);
    };

    const deleteVersion = async (id: number, path: string) => {
        if (!confirm('Excluir esta versão?')) return;
        await supabase.storage.from('installers').remove([path]);
        await supabase.from('app_versions').delete().eq('id', id);
        fetchVersions();
    };

    const [newKeyEmail, setNewKeyEmail] = useState('');

    const createKey = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const randomKey = 'KEY-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const { error } = await supabase.from('licenses').insert([{
            key_string: randomKey,
            status: 'unused',
            reserved_email: newKeyEmail ? newKeyEmail : null
        }]);

        if (error) {
            alert('Erro ao criar chave: ' + error.message);
        } else {
            setNewKeyEmail('');
            fetchLicenses();
        }
    };

    const togglePause = async (id: number, status: string) => {
        const target = status === 'paused' ? 'active' : 'paused';
        await supabase.from('licenses').update({ status: target }).eq('id', id);
        fetchLicenses();
    };
    const deleteKey = async (id: number) => {
        if (!confirm('Excluir?')) return;
        await supabase.from('licenses').delete().eq('id', id);
        fetchLicenses();
    };

    // Filter Logic
    const filteredLicenses = licenses.filter(l => l.key_string.includes(searchTerm) || (l.user_email || '').includes(searchTerm));

    // Webhook Test Simulation
    const simulatePurchase = async () => {
        setTestLoading(true);
        try {
            const payload = {
                source: 'simulator',
                event: 'purchase_approved',
                email: testEmail,
                status: 'paid',
                amount: 49.90,
                timestamp: new Date().toISOString()
            };

            // Call Vercel Serverless Function
            const response = await fetch('/api/webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                alert('Simulação enviada! Resposta da API: ' + (data.message || 'OK'));
                setTimeout(fetchWebhooks, 2000);
            } else {
                alert('Erro na API: ' + (data.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao conectar com API de Webhook (Verifique se está na Vercel).');
        }
        setTestLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#050505] flex text-gray-100 font-sans selection:bg-blue-500/30">
            {/* Sidebar */}
            <aside className="w-64 bg-[#111113] border-r border-white/5 flex flex-col fixed h-full z-20">
                <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5 bg-[#111113]/50 backdrop-blur-md">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <ShieldCheck size={18} />
                    </div>
                    <span className="font-bold text-lg tracking-tight">Admin</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <button onClick={() => setActiveView('sales')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeView === 'sales' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                        <DollarSign size={18} /> Vendas
                    </button>
                    <button onClick={() => setActiveView('keys')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeView === 'keys' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                        <Key size={18} /> Licenças
                    </button>
                    <button onClick={() => setActiveView('downloads')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeView === 'downloads' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                        <FileUp size={18} /> Uploads & Versões
                    </button>
                    <button onClick={() => setActiveView('webhooks')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeView === 'webhooks' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                        <Terminal size={18} /> Webhooks & Logs
                    </button>
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut size={18} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                {activeView === 'sales' && (
                    <div className="max-w-6xl mx-auto space-y-8">
                        <header>
                            <h1 className="text-3xl font-bold mb-2">Dashboard de Vendas</h1>
                            <p className="text-gray-500">Acompanhe sua receita em tempo real.</p>
                        </header>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[#111113] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <DollarSign size={64} />
                                </div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Receita Total</h3>
                                <p className="text-3xl font-bold text-white">
                                    {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                                <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                                    <Activity size={12} /> + R$ 49,90/venda
                                </p>
                            </div>

                            <div className="bg-[#111113] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Users size={64} />
                                </div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Vendas Totais</h3>
                                <p className="text-3xl font-bold text-white">{totalSales}</p>
                                <p className="text-xs text-blue-400 mt-2">Licenças Ativas ou Reservadas</p>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="bg-[#111113] border border-white/5 p-6 rounded-2xl">
                            <h2 className="text-lg font-bold mb-6">Receita por Dia</h2>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={salesData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: any) => [`R$ ${value}`, 'Receita']}
                                        />
                                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#111' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'webhooks' && (
                    <div className="max-w-5xl mx-auto">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">Webhooks & Testes</h1>
                                <p className="text-gray-500">Monitore eventos e simule compras.</p>
                            </div>
                            <button onClick={fetchWebhooks} className="bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors">
                                <RefreshCw size={20} />
                            </button>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Simulator */}
                            <div className="bg-[#111113] border border-white/5 p-6 rounded-2xl h-fit">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <Activity size={20} className="text-purple-400" /> Simulador
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Email do Cliente</label>
                                        <input
                                            type="email"
                                            value={testEmail}
                                            onChange={(e) => setTestEmail(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white"
                                        />
                                    </div>
                                    <button
                                        onClick={simulatePurchase}
                                        disabled={testLoading}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {testLoading ? 'Disparando...' : 'Simular Compra Aprovada'}
                                        <ExternalLink size={16} />
                                    </button>
                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                        Envia POST para <code>/api/webhook</code> (Vercel Function) e cria licença.
                                    </p>
                                </div>
                            </div>

                            {/* Logs List */}
                            <div className="md:col-span-2 space-y-4">
                                <h2 className="text-lg font-bold">Últimos Eventos Recebidos</h2>
                                {webhookLogs.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 border border-white/5 rounded-2xl border-dashed">Nenhum log encontrado.</div>
                                ) : (
                                    webhookLogs.map(log => (
                                        <div key={log.id} className="bg-[#111113] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${log.source === 'cakto' ? 'bg-green-500/10 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}>
                                                    {log.source.toUpperCase()}
                                                </span>
                                                <span className="text-xs text-gray-500 font-mono">{new Date(log.created_at).toLocaleString()}</span>
                                            </div>
                                            <pre className="text-xs text-gray-400 font-mono bg-black/50 p-2 rounded overflow-x-auto">
                                                {JSON.stringify(log.payload, null, 2)}
                                            </pre>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'downloads' && (
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-3xl font-bold mb-8">Gerenciar Downloads</h1>

                        <div className="bg-[#111113] border border-white/5 rounded-2xl p-6 mb-8">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FileUp size={20} /> Novo Upload</h2>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Versão (ex: v1.2)</label>
                                        <input
                                            type="text"
                                            value={uploadVersion}
                                            onChange={e => setUploadVersion(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-lg px-4 py-2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="block text-xs uppercase font-bold text-gray-500">Arquivo (.exe/.zip)</label>
                                            <label className="flex items-center gap-1 text-xs text-blue-400 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={useExternalLink}
                                                    onChange={e => setUseExternalLink(e.target.checked)}
                                                    className="w-3 h-3"
                                                />
                                                Usar Link Externo?
                                            </label>
                                        </div>

                                        {useExternalLink ? (
                                            <input
                                                type="url"
                                                placeholder="https://drive.google.com/..."
                                                value={externalLink}
                                                onChange={e => setExternalLink(e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white"
                                                required
                                            />
                                        ) : (
                                            <input
                                                type="file"
                                                onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)}
                                                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:bg-blue-600 file:text-white"
                                                required={!useExternalLink}
                                            />
                                        )}
                                    </div>
                                </div>
                                <button disabled={uploading} type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold w-full disabled:opacity-50">
                                    {uploading ? 'Enviando...' : 'Fazer Upload'}
                                </button>
                            </form>
                        </div>

                        <div className="space-y-4">
                            {versions.map(v => (
                                <div key={v.id} className="bg-[#111113] border border-white/5 rounded-xl p-4 flex justify-between items-center group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                                            <Archive size={20} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{v.version}</p>
                                            <p className="text-xs text-gray-500">{v.filename} • {new Date(v.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteVersion(v.id, v.storage_path)} className="text-gray-600 hover:text-red-400 p-2">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeView === 'keys' && (
                    <>
                        <header className="flex justify-between items-center mb-8">
                            <h1 className="text-3xl font-bold">Gerenciar Licenças</h1>
                        </header>

                        <div className="bg-[#111113] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="p-4 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#161618]">
                                <div className="relative w-full md:w-auto">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                    <input type="text" placeholder="Buscar chaves ou emails..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-[#0A0A0A] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white w-full md:w-64" />
                                </div>
                                <form onSubmit={createKey} className="flex items-center gap-2 w-full md:w-auto">
                                    <input
                                        type="email"
                                        placeholder="Email do Cliente (Opcional)"
                                        value={newKeyEmail}
                                        onChange={e => setNewKeyEmail(e.target.value)}
                                        className="bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full md:w-64"
                                    />
                                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap">
                                        <Plus size={16} /> Gerar
                                    </button>
                                </form>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-[#1C1C1E] text-xs uppercase text-gray-500"><tr><th className="p-4">Chave</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr></thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredLicenses.map(l => (
                                            <tr key={l.id} className="hover:bg-white/5">
                                                <td className="p-4">
                                                    <div className="font-mono text-sm font-bold text-white">{l.key_string}</div>
                                                    {l.reserved_email && (
                                                        <div className="text-xs text-blue-400 mt-0.5 flex items-center gap-1">
                                                            <Users size={10} /> {l.reserved_email}
                                                        </div>
                                                    )}
                                                    {l.user_email && l.user_email !== l.reserved_email && (
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            Ativado por: {l.user_email}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4"><span className={`px-2 py-1 rounded text-xs border ${l.status === 'active' ? 'border-green-500 text-green-400' : l.status === 'unused' ? 'border-blue-500 text-blue-400' : 'border-yellow-500 text-yellow-400'}`}>{l.status}</span></td>
                                                <td className="p-4 text-right flex justify-end gap-2">
                                                    <button onClick={() => togglePause(l.id, l.status)} className="p-2 hover:bg-white/10 rounded transition-colors" title={l.status === 'active' ? "Pausar Licença" : "Ativar Licença"}>
                                                        {l.status === 'active' ? (
                                                            <PauseCircle size={18} className="text-yellow-500 hover:text-yellow-400" />
                                                        ) : (
                                                            <PlayCircle size={18} className="text-green-500 hover:text-green-400" />
                                                        )}
                                                    </button>
                                                    <button onClick={() => deleteKey(l.id)} className="p-2 hover:bg-red-500/10 text-red-400 rounded"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
