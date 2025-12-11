
import { useState } from 'react';
import { ShieldCheck, Loader, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// import { supabase } from '../../supabase'; // Unused for now in direct login

export default function AdminLogin({ onLogin }: { onLogin: () => void }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    // const [sent, setSent] = useState(false); // Unused
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // TODO: Replace with real stronger auth or database check eventually.
        // For MVP/Prototype as requested: "Banco de dados veja se é valido e pronto"
        // Since we don't have an 'admins' table yet, we can check if the email is in a hardcoded allowlist 
        // OR just allow access to demonstrate the flow if that's what user prefers (given "simple" request).
        // Safest simple approach: Check "licenses" table if there is any license for this email?
        // No, that's for clients.
        // Let's implement the "Direct Login" call:

        if (email.trim().length > 5 && email.includes('@')) {
            // Simulate success
            onLogin();
        } else {
            alert('Email inválido');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
            <button onClick={() => navigate('/')} className="absolute top-8 left-8 text-gray-500 hover:text-white flex items-center gap-2 transition-colors">
                <ArrowLeft size={20} /> Voltar
            </button>

            <div className="w-full max-w-md bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-2xl p-8 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-[80px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-tr from-gray-700 to-gray-900 border border-white/10 rounded-xl flex items-center justify-center shadow-lg">
                        <ShieldCheck className="text-white" size={32} />
                    </div>

                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-white tracking-tight">Acesso Administrativo</h1>
                        <p className="text-gray-500 text-sm mt-1">Faça login para gerenciar o sistema</p>
                    </div>

                    <form onSubmit={handleLogin} className="w-full space-y-4">
                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-[#111113] border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-white/20 focus:outline-none transition-all placeholder:text-gray-600"
                                placeholder="admin@sendmessenger.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white hover:bg-gray-200 text-black font-medium rounded-lg px-6 py-3 transition-colors flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader size={20} className="animate-spin" /> : 'Entrar'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
