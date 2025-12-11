
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Download, Key, LogOut, Package, Loader, Zap } from 'lucide-react';

interface License {
    id: number;
    key_string: string;
    status: string;
    created_at: string;
}

interface AppVersion {
    version: string;
    filename: string;
    storage_path: string;
}

export default function ClientDashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [latestVersion, setLatestVersion] = useState<AppVersion | null>(null);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            // 1. Fetch Licenses (Only for this user)
            const { data: licData } = await supabase
                .from('licenses')
                .select('*')
                // Filter by reserved_email OR user_id (if claimed)
                .or(`reserved_email.eq.${user.email},user_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (licData) setLicenses(licData as License[]);

            // 2. Fetch Latest Version
            const { data: verData } = await supabase
                .from('app_versions')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false })
                .limit(1);

            if (verData && verData.length > 0) {
                const version = verData[0];
                setLatestVersion(version);

                // Get URL
                if (version.storage_path.startsWith('http')) {
                    setDownloadUrl(version.storage_path);
                } else {
                    const { data } = supabase.storage.from('installers').getPublicUrl(version.storage_path);
                    setDownloadUrl(data.publicUrl);
                }
            }
            setLoading(false);
        };

        loadData();
    }, [user]);

    return (
        <div className="min-h-screen bg-[#050505] font-sans text-gray-100 flex flex-col md:flex-row">

            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-[#111113] border-b md:border-b-0 md:border-r border-white/5 flex flex-col">
                <div className="h-16 flex items-center gap-3 px-6 bg-[#111113]/50 backdrop-blur-md">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Package size={18} />
                    </div>
                    <span className="font-bold text-lg tracking-tight">Portal do Cliente</span>
                </div>

                <div className="flex-1 p-6">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-medium text-sm truncate">Bem-vindo(a)</p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Minhas Licenças</h1>
                    <p className="text-gray-500 mt-1">Gerencie chaves e downloads dos seus produtos.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Licenses List */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500"><Loader className="animate-spin mx-auto mb-2" /> Buscando dados...</div>
                        ) : licenses.length === 0 ? (
                            <div className="p-8 bg-[#111113] border border-white/5 rounded-2xl text-center">
                                <Key className="mx-auto mb-4 text-gray-600" size={48} />
                                <h3 className="text-lg font-medium">Nenhuma licença encontrada</h3>
                                <p className="text-gray-500 text-sm mt-2">Verifique se o email da compra ({user.email}) está correto.</p>
                            </div>
                        ) : (
                            licenses.map(l => (
                                <div key={l.id} className="bg-[#111113] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-all" />

                                    <h4 className="font-bold text-lg text-white mb-1">SendMessenger Pro</h4>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${l.status === 'unused' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                            {l.status === 'unused' ? 'Disponível' : 'Ativa'}
                                        </span>
                                        <span className="text-xs text-gray-500">{new Date(l.created_at).toLocaleDateString()}</span>
                                    </div>

                                    <div className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 font-mono text-sm text-gray-300 flex items-center justify-between">
                                        {l.key_string}
                                        <button onClick={() => navigator.clipboard.writeText(l.key_string)} className="text-gray-500 hover:text-white transition-colors p-1" title="Copiar">
                                            <Key size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Download Area - Dynamic */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full pointer-events-none" />

                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2"><Zap className="fill-white" /> Área de Download</h3>
                            <p className="text-blue-100 mb-6 text-sm opacity-80">
                                Estamos sempre atualizando para garantir estabilidade e novos recursos.
                            </p>

                            {latestVersion ? (
                                <>
                                    <div className="mb-6">
                                        <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20">
                                            Versão Atual: {latestVersion.version}
                                        </span>
                                    </div>

                                    <a
                                        href={downloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl px-6 py-4 shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95 w-full"
                                    >
                                        <Download size={22} />
                                        Baixar Instalador
                                    </a>
                                    <p className="text-[10px] text-blue-200 mt-4 text-center opacity-70">
                                        Arquivo: {latestVersion.filename}
                                    </p>
                                </>
                            ) : (
                                <div className="bg-white/10 rounded-xl p-6 text-center border border-white/10">
                                    <p className="font-medium">Nenhuma versão disponível</p>
                                    <p className="text-xs opacity-70 mt-1">O administrador ainda não liberou o download.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
