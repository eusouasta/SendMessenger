
import { ArrowRight, MessageCircle, Shield, Zap, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">

            {/* Navbar */}
            <nav className="fixed top-0 left-0 w-full z-50 bg-black/50 backdrop-blur-lg border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <MessageCircle className="text-white" size={20} />
                        </div>
                        <span className="font-bold text-lg md:text-xl tracking-tight hidden xs:block">SendMessenger <span className="text-blue-500">Pro</span></span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                        <a href="#features" className="hover:text-white transition-colors">Recursos</a>
                        <a href="#benefits" className="hover:text-white transition-colors">Vantagens</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Preços</a>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => navigate('/auth')}
                            className="text-gray-300 hover:text-white font-medium text-xs md:text-sm transition-colors whitespace-nowrap"
                        >
                            Login
                        </button>
                        <button
                            onClick={() => window.open('https://pay.cakto.com.br/3dwbqws_683628', '_blank')}
                            className="bg-white hover:bg-gray-100 text-black px-4 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition-transform active:scale-95 shadow-lg shadow-white/10"
                        >
                            Comprar Agora
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
                {/* Background Glows */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-blue-400 text-sm font-medium mb-8 animate-fade-in-up">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Nova Versão 2.0 Disponível
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
                        Automação de WhatsApp <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">Simples e Poderosa.</span>
                    </h1>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Aumente suas vendas engajando seus clientes onde eles estão.
                        Disparos em massa, gestão de leads e anti-bloqueio integrado.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                        <button className="w-full md:w-auto bg-[#0071e3] hover:bg-[#0077ED] text-white text-lg font-bold px-8 py-4 rounded-full shadow-xl shadow-blue-500/20 transition-all hover:scale-105 flex items-center justify-center gap-2">
                            Começar Agora <ArrowRight size={20} />
                        </button>
                        <button className="w-full md:w-auto bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/10 text-white text-lg font-medium px-8 py-4 rounded-full transition-all flex items-center justify-center gap-2">
                            Ver Demonstração
                        </button>
                    </div>

                    {/* Stats / Social Proof */}
                    <div className="mt-20 pt-10 border-t border-white/5 flex flex-wrap justify-center gap-12 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="flex flex-col items-center">
                            <div className="text-3xl font-bold text-white">+5.000</div>
                            <div className="text-sm text-gray-500">Clientes Ativos</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="text-3xl font-bold text-white">99.9%</div>
                            <div className="text-sm text-gray-500">Uptime</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="text-3xl font-bold text-white">24/7</div>
                            <div className="text-sm text-gray-500">Suporte Dedicado</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-[#050505]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo que você precisa</h2>
                        <p className="text-gray-500">Ferramentas essenciais para escalar seu atendimento.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Zap className="text-amber-400" />}
                            title="Disparo Rápido"
                            desc="Envie milhares de mensagens em minutos com nossa infraestrutura otimizada."
                        />
                        <FeatureCard
                            icon={<Shield className="text-green-400" />}
                            title="Anti-Bloqueio"
                            desc="Algoritmos inteligentes de aquecimento e delay para proteger seu número."
                        />
                        <FeatureCard
                            icon={<Globe className="text-blue-400" />}
                            title="Faça o Download"
                            desc="Instalação simples e pratica! Roda no seu PC com um clique."
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 bg-[#020202] text-center">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-6 opacity-50">
                        <MessageCircle size={20} />
                        <span className="font-bold text-lg">SendMessenger</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-8">© 2025 SendMessenger Inc. Todos os direitos reservados.</p>
                    <div className="flex gap-6 text-sm text-gray-500">
                        <a href="#" className="hover:text-white transition-colors">Termos</a>
                        <a href="#" className="hover:text-white transition-colors">Privacidade</a>
                        <a href="#" className="hover:text-white transition-colors">Suporte</a>
                        <a onClick={() => navigate('/admin')} className="hover:text-blue-500 transition-colors cursor-pointer">Admin</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="bg-[#111113] border border-white/5 p-8 rounded-2xl hover:border-white/10 transition-colors group">
            <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-blue-400 transition-colors">{title}</h3>
            <p className="text-gray-400 leading-relaxed">
                {desc}
            </p>
        </div>
    );
}
