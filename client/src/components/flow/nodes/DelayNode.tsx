import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock, Trash2 } from 'lucide-react';

const DelayNode = ({ data, id }: NodeProps) => {
    const { ms, onDelete, onUpdate } = data as any;

    return (
        <div className="min-w-[150px] bg-[#1C1C1E] border border-orange-500/30 rounded-full shadow-lg overflow-hidden flex items-center pr-2 group hover:border-orange-500 transition-colors">

            {/* Icon Area */}
            <div className="bg-orange-500/10 h-10 w-10 flex items-center justify-center border-r border-orange-500/20">
                <Clock size={16} className="text-orange-400" />
            </div>

            {/* Content */}
            <div className="flex-1 px-3 flex items-center justify-center gap-2">
                <input
                    type="number"
                    className="w-12 bg-transparent text-center font-mono font-bold text-orange-400 focus:outline-none text-sm"
                    value={ms}
                    onChange={(e) => onUpdate(id, { ms: Number(e.target.value) })}
                    onMouseDown={(e) => e.stopPropagation()}
                />
                <span className="text-[10px] text-gray-500 font-bold uppercase">ms</span>
            </div>

            <button
                onClick={() => onDelete(id)}
                className="text-gray-600 hover:text-red-400 transition-colors hidden group-hover:block ml-1"
            >
                <Trash2 size={12} />
            </button>

            <Handle type="target" position={Position.Left} className="!bg-[#3a3a3c] !w-3 !h-3 !border-0 !rounded-full" />
            <Handle type="source" position={Position.Right} className="!bg-orange-500 !w-3 !h-3 !border-0 !rounded-full" />
        </div>
    );
};

export default memo(DelayNode);
