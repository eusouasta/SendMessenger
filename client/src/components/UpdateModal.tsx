import { X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface UpdateModalProps {
    status: {
        type: 'idle' | 'checking' | 'available' | 'not-available' | 'error' | 'downloading' | 'downloaded';
        payload?: any;
    };
    onClose: () => void;
    onRestart: () => void;
}

export default function UpdateModal({ status, onClose, onRestart }: UpdateModalProps) {
    if (status.type === 'idle') return null;

    // Calculate progress percentage safely
    const percent = status.type === 'downloading' && status.payload ? Math.round(status.payload.percent) : 0;
    const speed = status.type === 'downloading' && status.payload
        ? (status.payload.bytesPerSecond / 1024 / 1024).toFixed(2) + ' MB/s'
        : '';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 relative overflow-hidden">

                {/* Glow Effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="relative z-10">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <RefreshCw className={`w-5 h-5 ${status.type === 'checking' || status.type === 'downloading' ? 'animate-spin' : ''}`} />
                            Atualização do Sistema
                        </h3>
                        {(status.type === 'error' || status.type === 'downloaded' || status.type === 'not-available') && (
                            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Content based on state */}
                    <div className="space-y-4">

                        {status.type === 'checking' && (
                            <div className="text-gray-300 flex flex-col items-center py-4">
                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                <p>Verificando se há atualizações...</p>
                            </div>
                        )}

                        {status.type === 'not-available' && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 mb-3">
                                    <CheckCircle size={24} />
                                </div>
                                <h4 className="text-blue-400 font-bold mb-1">Sistema Atualizado!</h4>
                                <p className="text-gray-400 text-sm">Você já está utilizando a versão mais recente.</p>
                            </div>
                        )}

                        {status.type === 'available' && (
                            <div className="text-gray-300">
                                <p className="mb-2">Nova versão disponível: <span className="text-white font-mono font-bold">{status.payload?.version}</span></p>
                                <p className="text-sm text-gray-500">O download iniciará automaticamente.</p>
                            </div>
                        )}

                        {status.type === 'downloading' && (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm text-gray-400 mb-1">
                                    <span>Baixando atualização...</span>
                                    <span>{percent}%</span>
                                </div>

                                {/* Progress Bar Container */}
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>

                                <div className="flex justify-between text-xs text-gray-500 font-mono">
                                    <span>{speed}</span>
                                    <span>{(status.payload?.transferred / 1024 / 1024).toFixed(1)} / {(status.payload?.total / 1024 / 1024).toFixed(1)} MB</span>
                                </div>
                            </div>
                        )}

                        {status.type === 'downloaded' && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 mb-3">
                                    <CheckCircle size={24} />
                                </div>
                                <h4 className="text-green-400 font-bold mb-1">Download Concluído!</h4>
                                <p className="text-gray-400 text-sm mb-4">A atualização está pronta para ser instalada.</p>

                                <button
                                    onClick={onRestart}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={18} />
                                    Reiniciar e Instalar
                                </button>
                            </div>
                        )}

                        {status.type === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h4 className="text-red-400 font-bold text-sm">Erro na Atualização</h4>
                                    <p className="text-red-300/70 text-xs mt-1 break-all">
                                        {typeof status.payload === 'string' ? status.payload : 'Ocorreu um erro desconhecido.'}
                                    </p>
                                </div>
                            </div>
                        )}

                    </div>

                </div>
            </div>
        </div>
    );
}
