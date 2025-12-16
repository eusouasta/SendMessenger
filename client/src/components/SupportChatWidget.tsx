import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Loader } from 'lucide-react';
// Supabase initialized locally below

// Just in case, I will re-import createClient if socket.ts doesn't export it, but I recall previous file checks showed supabase usage.
// Actually, client/src/socket.ts usually sets up Socket.IO.
// I should check client/supabase.ts existence or reuse the one from socket?
// Let's assume standard supabase import or create one if needed.
// Wait, I haven't seen client/src/supabase.ts. I saw admin-dashboard/src/supabase.ts.
// I will assume I need to initialize it here or import.
// For now, I will create a local client instance using env vars as is standard Vite.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uijzbjnenqkeqdpnbsct.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpanpiam5lbnFrZXFkcG5ic2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODc3NDcsImV4cCI6MjA4MDk2Mzc0N30.4IYvw9yDxrjb-eg2TKNpcUTc5zrsCUJmznWzVEvTI2I';

// Use existing instance if possible, but creating new one is safe for component scope
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Message {
    id: string;
    content: string;
    sender_role: 'user' | 'admin';
    created_at: string;
}

export default function SupportChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Get User
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUser(user);
                loadChat(user.id);
            }
        });
    }, []);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const loadChat = async (userId: string) => {
        // Find existing open chat
        const { data: chats } = await supabaseClient
            .from('support_chats')
            .select('id')
            .eq('user_id', userId)
            // .eq('status', 'open') // Assume we just load the latest one or similar
            .order('created_at', { ascending: false })
            .limit(1);

        if (chats && chats.length > 0) {
            const id = chats[0].id;
            setChatId(id);
            subscribeToMessages(id);
        }
    };

    const subscribeToMessages = (id: string) => {
        // Initial load
        supabaseClient
            .from('support_messages')
            .select('*')
            .eq('chat_id', id)
            .order('created_at', { ascending: true })
            .then(({ data }) => {
                if (data) setMessages(data as any);
            });

        // Realtime subscription
        const channel = supabaseClient
            .channel(`chat:${id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${id}` }, (payload) => {
                setMessages((prev) => [...prev, payload.new as any]);
            })
            .subscribe();

        return () => supabaseClient.removeChannel(channel);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        let currentChatId = chatId;

        // If no chat exists, create one
        if (!currentChatId) {
            setLoading(true);
            const { data: newChat, error } = await supabaseClient
                .from('support_chats')
                .insert({ user_id: user.id })
                .select()
                .single();

            if (error || !newChat) {
                console.error('Error creating chat', error);
                setLoading(false);
                return;
            }

            currentChatId = newChat.id;
            setChatId(currentChatId);
            if (currentChatId) subscribeToMessages(currentChatId);
            setLoading(false);
        } else {
            // If we didn't create a new one, we are using the existing one.
            // But subscribeToMessages might have been called already? 
            // Actually handleSendMessage just sends a message. The subscription happens on load.
            // We only need to subscribe if we JUST created the chat.
        }

        if (!currentChatId) return; // Should not happen

        // Send Message
        await supabaseClient.from('support_messages').insert({
            chat_id: currentChatId,
            sender_role: 'user',
            content: newMessage
        });

        setNewMessage('');
    };

    if (!user) return null; // Only show for logged in users

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 md:w-96 h-[500px] bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">
                    <div className="bg-[#2C2C2E] p-4 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <h3 className="font-bold text-white">Suporte Premium</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 text-sm mt-10">
                                <p>Olá! Como podemos ajudar você hoje?</p>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.sender_role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-[#3A3A3C] text-gray-200 rounded-bl-none'
                                        }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 bg-[#2C2C2E] border-t border-white/5 flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="flex-1 bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
            >
                {isOpen ? <X size={28} className="text-white" /> : <MessageCircle size={28} className="text-white" />}
            </button>
        </div>
    );
}
