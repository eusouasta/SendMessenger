import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MessageSquare, Image as ImageIcon, Mic, Trash2, FileVideo } from 'lucide-react';

const MessageNode = ({ data, id }: NodeProps) => {
    const { type, content, path, caption, onDelete, onUpdate } = data as any;

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            let filePath = '';
            if ((window as any).require) {
                try {
                    const { webUtils } = (window as any).require('electron');
                    filePath = webUtils.getPathForFile(file);
                } catch (err) {
                    console.error('WebUtils error:', err);
                }
            }
            // Fallback
            if (!filePath) {
                // @ts-ignore
                filePath = file.path;
            }
            onUpdate(id, { path: filePath, content: file.name });
        }
    };

    return (
        <div className="min-w-[280px] bg-[#1C1C1E] border border-white/10 rounded-xl shadow-2xl overflow-hidden group hover:border-[#0071e3]/50 transition-colors">
            {/* Header */}
            <div className="bg-[#2C2C2E] px-4 py-2 flex items-center justify-between border-b border-white/5 handle cursor-move">
                <div className="flex items-center gap-2">
                    {type === 'text' && <MessageSquare size={14} className="text-blue-400" />}
                    {type === 'media' && <ImageIcon size={14} className="text-purple-400" />}
                    {type === 'audio' && <Mic size={14} className="text-green-400" />}
                    <span className="text-xs font-bold text-gray-200 uppercase tracking-wide">
                        {type === 'text' ? 'Mensagem' : type === 'media' ? 'Mídia' : 'Áudio'}
                    </span>
                </div>
                <button
                    onClick={() => onDelete(id)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
                {/* Type Selector (Header Context Menu in future, but simplified here) */}

                {type === 'text' && (
                    <textarea
                        className="w-full h-24 bg-[#0A0A0A] border border-white/10 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50 resize-none font-sans"
                        placeholder="Digite sua mensagem..."
                        value={content}
                        onChange={(e) => onUpdate(id, { content: e.target.value })}
                        onMouseDown={(e) => e.stopPropagation()} // Prevent drag
                    />
                )}

                {type === 'media' && (
                    <div className="space-y-2">
                        <div className="border hover:border-blue-500/30 border-dashed border-white/10 rounded-lg p-4 flex flex-col items-center justify-center text-center transition-colors bg-[#0A0A0A]">
                            <FileVideo size={24} className="text-gray-600 mb-2" />
                            <span className="text-[10px] text-gray-400 mb-2">Clique ou arraste</span>
                            <input
                                type="file"
                                accept="image/*,video/*"
                                className="text-[10px] text-gray-500 file:hidden w-full text-center"
                                onChange={handleFileChange}
                            />
                        </div>
                        {path && <div className="text-[10px] text-purple-400 truncate bg-purple-500/10 px-2 py-1 rounded">{path}</div>}
                        <input
                            type="text"
                            placeholder="Legenda (opcional)"
                            className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500/50"
                            value={caption || ''}
                            onChange={(e) => onUpdate(id, { caption: e.target.value })}
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {type === 'audio' && (
                    <div className="space-y-2">
                        <div className="border border-dashed border-white/10 rounded-lg p-3 flex items-center justify-between bg-[#0A0A0A]">
                            <span className="text-[10px] text-gray-400">Arquivo .ogg</span>
                            <input
                                type="file"
                                accept=".ogg,audio/ogg"
                                className="text-[10px] text-gray-500 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-600 file:text-white file:text-[10px]"
                                onChange={handleFileChange}
                            />
                        </div>
                        {path && <div className="text-[10px] text-green-400 truncate bg-green-500/10 px-2 py-1 rounded">{path}</div>}
                    </div>
                )}
            </div>

            <Handle type="target" position={Position.Left} className="!bg-[#3a3a3c] !w-3 !h-3 !border-0" />
            <Handle type="source" position={Position.Right} className="!bg-[#0071e3] !w-3 !h-3 !border-0" />
        </div>
    );
};

export default memo(MessageNode);
