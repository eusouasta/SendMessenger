import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { MessageCircle, Send, User, Check } from 'lucide-react';

interface Chat {
    id: string;
    user_id: string;
    status: string;
    updated_at: string;
    last_message?: string;
    unread_count?: number;
}

interface Message {
    id: string;
    content: string;
    sender_role: 'user' | 'admin';
    created_at: string;
}

export default function AdminChatPanel() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [reply, setReply] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadChats();

        const channel = supabase
            .channel('admin-chats-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_chats' }, () => {
                loadChats();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => {
                loadChats(); // Refresh order/last message
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat);
            const channel = supabase
                .channel(`admin-chat:${selectedChat}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${selectedChat}` }, (payload) => {
                    setMessages((prev) => [...prev, payload.new as any]);
                    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                })
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [selectedChat]);

    const loadChats = async () => {
        const { data } = await supabase
            .from('support_chats')
            .select('*')
            .order('updated_at', { ascending: false });

        if (data) setChats(data);
    };

    const loadMessages = async (chatId: string) => {
        const { data } = await supabase
            .from('support_messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data as any);
            setTimeout(() => {
                if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reply.trim() || !selectedChat) return;

        await supabase.from('support_messages').insert({
            chat_id: selectedChat,
            sender_role: 'admin',
            content: reply
        });

        // Update chat timestamp
        await supabase.from('support_chats').update({ updated_at: new Date().toISOString() }).eq('id', selectedChat);

        setReply('');
    };

    return (
        <div className="flex h-screen bg-[#0A0A0A] text-white">
            {/* Sidebar List */}
            <div className="w-80 border-r border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <h2 className="font-bold flex items-center gap-2">
                        <MessageCircle size={20} className="text-blue-500" />
                        Chat de Suporte
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {chats.map(chat => (
                        <button
                            key={chat.id}
                            onClick={() => setSelectedChat(chat.id)}
                            className={`w-full p-4 border-b border-white/5 flex items-start gap-3 hover:bg-white/5 transition-colors text-left ${selectedChat === chat.id ? 'bg-blue-900/10 border-l-4 border-l-blue-500' : ''}`}
                        >
                            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center shrink-0">
                                <User size={18} className="text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="font-medium text-sm truncate text-gray-200">User {chat.user_id?.slice(0, 4)}...</span>
                                    <span className="text-xs text-gray-500">{new Date(chat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-xs text-gray-400 truncate">Clique para ver mensagens</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat View */}
            <div className="flex-1 flex flex-col bg-[#111113]">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1C1C1E]">
                            <div>
                                <h3 className="font-bold">Chat #{selectedChat.slice(0, 8)}</h3>
                                <div className="flex items-center gap-2 text-xs text-green-500">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    Online / Ativo
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${msg.sender_role === 'admin'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-[#2C2C2E] text-gray-200 rounded-bl-none'
                                        }`}>
                                        <p className="text-sm">{msg.content}</p>
                                        <div className="text-[10px] opacity-50 mt-1 flex justify-end gap-1 items-center">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {msg.sender_role === 'admin' && <Check size={10} />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendReply} className="p-4 bg-[#1C1C1E] border-t border-white/10 flex gap-3">
                            <input
                                type="text"
                                value={reply}
                                onChange={e => setReply(e.target.value)}
                                className="flex-1 bg-[#2C2C2E] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder="Responda ao usuário..."
                            />
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-medium transition-colors flex items-center justify-center"
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <MessageCircle size={48} className="mb-4 opacity-20" />
                        <p>Selecione um chat para iniciar o atendimento</p>
                    </div>
                )}
            </div>
        </div>
    );
}
