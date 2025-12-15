import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    type Connection,
    type Edge,
    type Node,
    BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save } from 'lucide-react';

import FlowSidebar from './FlowSidebar';
import MessageNode from './nodes/MessageNode';
import DelayNode from './nodes/DelayNode';

const nodeTypes = {
    message: MessageNode,
    delay: DelayNode,
};

let id = 0;
const getId = () => `dndnode_${id++}`;

interface FlowEditorProps {
    initialSteps: any[];
    onSave: (steps: any[], extraData?: any) => void;
    onBack: () => void;
    isRuleMode?: boolean;
}

const FlowEditorInner = (props: FlowEditorProps) => {
    const { initialSteps, onSave, onBack } = props;
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    // Initialize from Linear Steps (Basic implementation)
    useEffect(() => {
        if (initialSteps.length > 0 && nodes.length === 0) {
            let x = 100;

            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];

            initialSteps.forEach((step, index) => {
                const nodeId = `step_${index}`;
                const type = step.type === 'delay' ? 'delay' : 'message';

                newNodes.push({
                    id: nodeId,
                    type,
                    position: { x, y: 100 },
                    data: {
                        ...step,
                        onDelete: (id: string) => setNodes((nds) => nds.filter((n) => n.id !== id)),
                        onUpdate: (id: string, data: any) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
                    },
                });

                if (index > 0) {
                    newEdges.push({
                        id: `e${index - 1}-${index}`,
                        source: `step_${index - 1}`,
                        target: nodeId,
                    });
                }

                x += type === 'delay' ? 200 : 350;
            });
            setNodes(newNodes);
            setEdges(newEdges);
        }
    }, [initialSteps, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            if (!reactFlowWrapper.current || !reactFlowInstance) return;

            const type = event.dataTransfer.getData('application/reactflow');
            const messageType = event.dataTransfer.getData('application/messageType');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: getId(),
                type,
                position,
                data: {
                    type: messageType || type, // 'text', 'media', 'audio' inside 'message' node type
                    content: '',
                    ms: 2000,
                    onDelete: (id: string) => setNodes((nds) => nds.filter((n) => n.id !== id)),
                    onUpdate: (id: string, data: any) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes],
    );

    const [showRuleModal, setShowRuleModal] = useState(false);
    const [ruleName, setRuleName] = useState('');
    const [ruleTriggers, setRuleTriggers] = useState('');
    const [ruleOncePerUser, setRuleOncePerUser] = useState(false);

    const handleSaveClick = () => {
        if (props.isRuleMode) {
            setShowRuleModal(true);
        } else {
            processSave();
        }
    };

    const processSave = (extraData = {}) => {
        // Topo-sort or simple X-coordinate sort for MVP linear conversion
        const sortedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x);

        const steps = sortedNodes.map(node => {
            const { onDelete, onUpdate, ...cleanData } = node.data;
            return {
                id: node.id,
                ...cleanData
            };
        });

        console.log('Saved Steps:', steps);
        onSave(steps, extraData);
        setShowRuleModal(false);
    };

    return (
        <div className="flex h-full w-full bg-[#0A0A0A]">
            <FlowSidebar />
            <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button
                        onClick={onBack}
                        className="bg-[#2C2C2E] hover:bg-[#3a3a3c] text-gray-200 px-4 py-2 rounded-lg font-bold shadow-lg border border-white/10 active:scale-95 transition-all text-xs uppercase tracking-wide"
                    >
                        Voltar
                    </button>
                    <button
                        onClick={handleSaveClick}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-all"
                    >
                        <Save size={16} /> {props.isRuleMode ? 'Salvar Regra' : 'Salvar Fluxo'}
                    </button>
                </div>

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    nodeTypes={nodeTypes}
                    fitView
                    className="bg-dots-darker"
                >
                    <Controls className="!bg-[#1C1C1E] !border-white/10 !fill-gray-400" />
                    <Background color="#333" gap={20} variant={BackgroundVariant.Dots} />
                </ReactFlow>

                {/* Chatbot Rule Modal */}
                {showRuleModal && (
                    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                        <div className="bg-[#1C1C1E] rounded-xl border border-white/10 p-6 w-96 space-y-4">
                            <h3 className="text-lg font-bold text-white">Configurar Regra</h3>

                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 uppercase font-bold">Nome da Regra</label>
                                <input
                                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    placeholder="Ex: Ver Preços"
                                    value={ruleName}
                                    onChange={e => setRuleName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 uppercase font-bold">Gatilhos (Geralmente palavras-chave)</label>
                                <input
                                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    placeholder="Ex: preço, valor, quanto custa"
                                    value={ruleTriggers}
                                    onChange={e => setRuleTriggers(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-500">Separe as palavras por vírgula.</p>
                            </div>

                            <div className="flex items-center gap-2 py-2">
                                <input
                                    type="checkbox"
                                    id="oncePerUser"
                                    checked={ruleOncePerUser}
                                    onChange={e => setRuleOncePerUser(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-600 bg-[#0A0A0A] text-cyan-600 focus:ring-cyan-500"
                                />
                                <label htmlFor="oncePerUser" className="text-sm text-gray-300 select-none">Enviar apenas uma vez por pessoa?</label>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setShowRuleModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-bold">Cancelar</button>
                                <button
                                    onClick={() => processSave({
                                        name: ruleName,
                                        triggers: ruleTriggers.split(',').map(t => t.trim()),
                                        oncePerUser: ruleOncePerUser
                                    })}
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-sm font-bold"
                                    disabled={!ruleName || !ruleTriggers}
                                >
                                    Salvar Regra
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const FlowEditor = (props: FlowEditorProps) => (
    <ReactFlowProvider>
        <FlowEditorInner {...props} />
    </ReactFlowProvider>
);

export default FlowEditor;
