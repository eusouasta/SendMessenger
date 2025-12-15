import React from 'react';
import { MessageSquare, Image, Mic, Clock, Settings } from 'lucide-react';

const FlowSidebar = () => {
    const onDragStart = (event: React.DragEvent, nodeType: string, messageType?: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        if (messageType) {
            event.dataTransfer.setData('application/messageType', messageType);
        }
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-[240px] bg-[#1C1C1E] border-r border-white/5 flex flex-col h-full z-10 shrink-0">
            <div className="p-4 border-b border-white/5">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Settings size={14} />
                    Componentes
                </h2>
            </div>

            <div className="p-4 space-y-3">
                <div className="text-[10px] text-gray-500 font-bold uppercase mb-2">Mensagens</div>

                <div className="dndnode input bg-[#2C2C2E] p-3 rounded-lg border border-white/5 cursor-grab hover:bg-white/5 transition-colors flex items-center gap-3 shadow-sm select-none"
                    onDragStart={(event) => onDragStart(event, 'message', 'text')} draggable>
                    <div className="bg-blue-500/10 p-2 rounded text-blue-400">
                        <MessageSquare size={16} />
                    </div>
                    <span className="text-sm text-gray-200 font-medium">Texto</span>
                </div>

                <div className="dndnode input bg-[#2C2C2E] p-3 rounded-lg border border-white/5 cursor-grab hover:bg-white/5 transition-colors flex items-center gap-3 shadow-sm select-none"
                    onDragStart={(event) => onDragStart(event, 'message', 'media')} draggable>
                    <div className="bg-purple-500/10 p-2 rounded text-purple-400">
                        <Image size={16} />
                    </div>
                    <span className="text-sm text-gray-200 font-medium">Mídia</span>
                </div>

                <div className="dndnode input bg-[#2C2C2E] p-3 rounded-lg border border-white/5 cursor-grab hover:bg-white/5 transition-colors flex items-center gap-3 shadow-sm select-none"
                    onDragStart={(event) => onDragStart(event, 'message', 'audio')} draggable>
                    <div className="bg-green-500/10 p-2 rounded text-green-400">
                        <Mic size={16} />
                    </div>
                    <span className="text-sm text-gray-200 font-medium">Áudio</span>
                </div>

                <div className="text-[10px] text-gray-500 font-bold uppercase mb-2 mt-6">Controle</div>

                <div className="dndnode input bg-[#2C2C2E] p-3 rounded-lg border border-white/5 cursor-grab hover:bg-white/5 transition-colors flex items-center gap-3 shadow-sm select-none"
                    onDragStart={(event) => onDragStart(event, 'delay')} draggable>
                    <div className="bg-orange-500/10 p-2 rounded text-orange-400">
                        <Clock size={16} />
                    </div>
                    <span className="text-sm text-gray-200 font-medium">Delay (Tempo)</span>
                </div>
            </div>

            <div className="mt-auto p-4 border-t border-white/5 text-[10px] text-gray-500 text-center">
                Arraste os itens para o editor
            </div>
        </aside>
    );
};

export default FlowSidebar;
