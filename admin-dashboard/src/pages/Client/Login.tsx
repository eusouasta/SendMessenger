
import { useState } from 'react';
import { supabase } from '../../supabase';
import { Loader, Chrome, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClientLogin() {
    const [loadingGoogle, setLoadingGoogle] = useState(false);
    const [email, setEmail] = useState('');
    const [loadingOtp, setLoadingOtp] = useState(false);
    // const [otpSent, setOtpSent] = useState(false); // Unused
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        setLoadingGoogle(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard'
            }
        });
        if (error) {
            alert('Erro no Login Google: ' + error.message);
            setLoadingGoogle(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingOtp(true);

        // Direct Login Check
        try {
            // Check if there is ANY license associated with this email (reserved)
            const { data } = await supabase
                .from('licenses')
                .select('id')
                .eq('reserved_email', email)
                .limit(1);

            if (data && data.length > 0) {
                // Success!
                // Set local session since we are bypassing Supabase Auth for this "Direct" mode
                localStorage.setItem('client_email', email);
                localStorage.setItem('client_auth', 'true');

                // Force a reload or navigation to pick up the new "virtual" session in App.tsx
                // navigate('/dashboard'); // App.tsx might need a trigger. 
                // Actually App.tsx checks localStorage on mount. 
                // So we can just redirect.
                window.location.href = '/dashboard';
            } else {
                alert('Email não encontrado ou sem licença ativa.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao verificar email.');
        }

        setLoadingOtp(false);
    };

    return (
        <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
            {/* Back Button */}
            <button onClick={() => navigate('/')} className="absolute top-8 left-8 text-gray-500 hover:text-white flex items-center gap-2 transition-colors">
                <ArrowLeft size={20} /> Voltar
            </button>

            <div className="w-full max-w-md bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-2xl p-8 relative overflow-hidden text-center">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-600/20 blur-[90px] rounded-full pointer-events-none" />

                <h2 className="text-3xl font-bold text-white mb-2 relative z-10">Área do Cliente</h2>
                <p className="text-gray-400 mb-8 relative z-10">Faça login para acessar suas licenças e downloads.</p>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loadingGoogle}
                    className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold rounded-xl px-6 py-4 transition-all flex justify-center items-center gap-3 shadow-lg relative z-10"
                >
                    {loadingGoogle ? <Loader size={24} className="animate-spin text-gray-600" /> : <><Chrome size={24} className="text-blue-600" /> Entrar com Google</>}
                </button>

                <div className="flex items-center w-full gap-4 text-gray-600 my-6 relative z-10">
                    <div className="h-px bg-white/10 flex-1" /> <span className="text-xs font-mono uppercase">Ou com Email</span> <div className="h-px bg-white/10 flex-1" />
                </div>

                {/* Email Magic Link Section */}
                <form onSubmit={handleEmailLogin} className="relative z-10 space-y-3">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-[#111113] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all placeholder:text-gray-600"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loadingOtp}
                        className="w-full bg-[#1C1C1E] border border-white/10 hover:bg-[#2C2C2E] text-white font-medium rounded-xl px-6 py-3 transition-colors flex justify-center items-center gap-2"
                    >
                        {loadingOtp ? <Loader size={20} className="animate-spin" /> : 'Entrar'}
                    </button>
                    {/* {otpSent && <p className="text-green-400 text-sm mt-2">Link enviado! Verifique sua caixa de entrada (e spam).</p>} */}
                </form>

                <p className="text-xs text-gray-600 mt-6 relative z-10">
                    Ao continuar, você concorda com nossos Termos de Uso.
                </p>
            </div>
        </div>
    );
}
