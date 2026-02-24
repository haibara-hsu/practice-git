
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wind, Feather, Loader2, ScanSearch, Save, Download, Upload, Image as ImageIcon, Check, Folder, Trash2, X, Clock, Link as LinkIcon } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { NodeData, NodeType, Position, Link, Viewport, SnapshotMeta } from './types';
import { PLACEHOLDER_TEXT, APP_TITLE } from './constants';
import NodeCard from './components/NodeCard';
import ConnectionLines from './components/ConnectionLines';

// Define html2canvas on window
declare global {
  interface Window {
    html2canvas: any;
  }
}

const App: React.FC = () => {
  // --- State Initialization with LocalStorage ---
  const [nodes, setNodes] = useState<NodeData[]>(() => {
    try {
      const saved = localStorage.getItem('cc_nodes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [links, setLinks] = useState<Link[]>(() => {
    try {
      const saved = localStorage.getItem('cc_links');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [viewport, setViewport] = useState<Viewport>(() => {
    try {
      const saved = localStorage.getItem('cc_viewport');
      return saved ? JSON.parse(saved) : { x: 0, y: 0, scale: 1 };
    } catch (e) { return { x: 0, y: 0, scale: 1 }; }
  });

  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>(() => {
    try {
      const saved = localStorage.getItem('cc_snapshots_meta');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [inputValue, setInputValue] = useState('');
  const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [showSnapshots, setShowSnapshots] = useState(false);
  
  // Manual Linking State
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Position | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef<Position>({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence Handlers ---

  // Auto-save effect: Automatically persists state whenever it changes (Current Workspace)
  useEffect(() => {
    localStorage.setItem('cc_nodes', JSON.stringify(nodes));
    localStorage.setItem('cc_links', JSON.stringify(links));
    localStorage.setItem('cc_viewport', JSON.stringify(viewport));
  }, [nodes, links, viewport]);

  const handleSaveToLocalStorage = () => {
    // Quick save to current workspace
    localStorage.setItem('cc_nodes', JSON.stringify(nodes));
    localStorage.setItem('cc_links', JSON.stringify(links));
    localStorage.setItem('cc_viewport', JSON.stringify(viewport));
    
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleSaveSnapshot = () => {
    const defaultName = `存檔 ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    const name = prompt("為此畫布命名：", defaultName);
    
    if (name) {
      const id = Date.now().toString();
      const newMeta: SnapshotMeta = { id, name, date: Date.now() };
      const data = { nodes, links, viewport };
      
      try {
        localStorage.setItem(`cc_snapshot_${id}`, JSON.stringify(data));
        const updatedSnapshots = [newMeta, ...snapshots];
        localStorage.setItem('cc_snapshots_meta', JSON.stringify(updatedSnapshots));
        setSnapshots(updatedSnapshots);
        alert("存檔成功！");
      } catch (e) {
        alert("儲存失敗，可能是瀏覽器儲存空間不足。");
      }
    }
  };

  const handleLoadSnapshot = (id: string) => {
    if (nodes.length > 0 && !confirm("確定要讀取舊存檔嗎？目前的未儲存變更可能會被覆蓋。")) {
      return;
    }

    try {
      const dataStr = localStorage.getItem(`cc_snapshot_${id}`);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        setNodes(data.nodes || []);
        setLinks(data.links || []);
        setViewport(data.viewport || { x: 0, y: 0, scale: 1 });
        setShowSnapshots(false);
      } else {
        alert("找不到此存檔資料。");
      }
    } catch (e) {
      alert("讀取失敗。");
    }
  };

  const handleDeleteSnapshot = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("確定要刪除此存檔嗎？")) return;

    const updatedSnapshots = snapshots.filter(s => s.id !== id);
    setSnapshots(updatedSnapshots);
    localStorage.setItem('cc_snapshots_meta', JSON.stringify(updatedSnapshots));
    localStorage.removeItem(`cc_snapshot_${id}`);
  };

  const handleExportJson = () => {
    const data = { nodes, links, viewport, version: 1 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cognitive-canvas-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.nodes && Array.isArray(json.nodes)) {
          setNodes(json.nodes);
          setLinks(json.links || []);
          if (json.viewport) setViewport(json.viewport);
          alert("專案讀取成功！");
        }
      } catch (err) {
        alert("檔案格式錯誤，無法讀取。");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportImage = async () => {
    if (typeof window.html2canvas === 'undefined') {
      alert("Image export library not loaded.");
      return;
    }
    
    try {
      const canvas = await window.html2canvas(document.body, {
        backgroundColor: '#f5f5f4',
        ignoreElements: (element: Element) => {
           return element.classList.contains('toolbar-ui') || element.tagName === 'HEADER' || element.tagName === 'FORM';
        }
      });
      const image = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = image;
      a.download = `cognitive-canvas-snapshot-${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.error(err);
      alert("圖片輸出失敗");
    }
  };

  // --- Canvas Interaction Logic ---

  const screenToWorld = (screenX: number, screenY: number) => {
    return {
      x: (screenX - viewport.x) / viewport.scale,
      y: (screenY - viewport.y) / viewport.scale
    };
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const worldBefore = screenToWorld(mouseX, mouseY);

    const zoomSensitivity = 0.001;
    const zoomFactor = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(0.2, viewport.scale + zoomFactor), 3);
    
    const newViewportX = mouseX - worldBefore.x * newScale;
    const newViewportY = mouseY - worldBefore.y * newScale;

    setViewport({ x: newViewportX, y: newViewportY, scale: newScale });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.node-card')) return;

    setIsDraggingCanvas(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setMousePos(worldPos);

    if (isDraggingCanvas) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDraggingCanvas(false);
    if (e.target instanceof HTMLElement) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const recenterCanvas = () => {
    if (nodes.length === 0) {
      setViewport({ x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100, scale: 1 });
      return;
    }
    const userNodes = nodes.filter(n => n.type === NodeType.USER);
    if (userNodes.length === 0) return;

    const xs = userNodes.map(n => n.position.x);
    const ys = userNodes.map(n => n.position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    setViewport({
      x: window.innerWidth / 2 - centerX * viewport.scale - 144,
      y: window.innerHeight / 2 - centerY * viewport.scale - 60,
      scale: 1
    });
  };

  // --- Node Logic ---

  const handleNodePositionChange = (id: string, newPos: Position) => {
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        return { ...node, position: newPos };
      }
      return node;
    }));
  };

  const handleNodeTextChange = (id: string, newText: string) => {
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        return { ...node, text: newText };
      }
      return node;
    }));
  };

  const handlePinNode = (id: string) => {
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        return { ...node, isPinned: !node.isPinned };
      }
      return node;
    }));
  };

  // --- Manual Linking Logic ---

  const handleLinkModeToggle = () => {
    setIsLinkingMode(!isLinkingMode);
    setLinkSourceId(null); // Reset selection on toggle
  };

  const handleNodeClick = (id: string) => {
    if (!isLinkingMode) return;

    if (linkSourceId === null) {
      // Select Source
      setLinkSourceId(id);
    } else {
      // Select Target
      if (linkSourceId === id) {
        // Deselect if clicking same node
        setLinkSourceId(null);
        return;
      }

      // Create Link
      const exists = links.some(l => 
        (l.fromId === linkSourceId && l.toId === id) ||
        (l.fromId === id && l.toId === linkSourceId)
      );

      if (!exists) {
        const newLink: Link = {
          id: `link-${Date.now()}`,
          fromId: linkSourceId,
          toId: id
        };
        setLinks(prev => [...prev, newLink]);
      }
      
      // Reset selection after linking
      setLinkSourceId(null);
    }
  };

  const generateAISuggestions = async (userText: string, parentNodeId: string) => {
    try {
      setLoadingNodeId(parentNodeId);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: `User Input: "${userText}"`,
        config: {
          systemInstruction: `角色：你是一位洞察力敏銳的認知夥伴。
          目標：針對使用者的想法，提出 4 個不同面向的探究性問題，旨在挖掘細節、原因、背景或潛在含義。不要使用產品經理的口吻，不要預設這是商業專案。

          請針對使用者的輸入，生成 4 個簡短的繁體中文提問：

          1. **釐清細節 (Clarification)** -> 分配角度 0 (右)
             - 詢問具體內容、定義或範疇。例如：「具體是指哪部分？」、「你的定義是什麼？」
          2. **探究原因 (Causality)** -> 分配角度 90 (下)
             - 詢問背後的動機、導火線或根本原因。例如：「為什麼是現在？」、「背後的深層原因是？」
          3. **探索影響 (Impact)** -> 分配角度 180 (左)
             - 詢問對周遭、情緒或未來的影響。例如：「這會如何影響你的生活？」、「誰會受到影響？」
          4. **反思假設 (Reflection)** -> 分配角度 270 (上)
             - 挑戰既定觀點或思考反面。例如：「如果不這樣做會怎樣？」、「有沒有相反的可能性？」

          嚴格限制：
          1. 語言：繁體中文 (台灣)。
          2. 長度：每個問題 **絕對不超過 15 個字**。
          3. 風格：好奇、開放、引導思考 (Curious & Open)。

          輸出格式：JSON Array，包含 4 個物件 (text, angle)。`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                angle: { type: Type.NUMBER }
              },
              required: ["text", "angle"]
            }
          }
        }
      });

      const suggestions = JSON.parse(response.text || "[]");
      
      const newNodes: NodeData[] = [];

      suggestions.forEach((s: any, index: number) => {
        const newNodeId = `ai-${parentNodeId}-${index}-${Date.now()}`;

        newNodes.push({
          id: newNodeId,
          type: NodeType.AI,
          text: s.text,
          position: { x: 0, y: 0 }, 
          createdAt: Date.now() + index * 100,
          isPinned: false, 
          parentId: parentNodeId,
          angle: s.angle
        });
      });

      setNodes(prev => [...prev, ...newNodes]);

    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setLoadingNodeId(null);
    }
  };

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const lastUserNode = [...nodes]
      .filter(n => n.type === NodeType.USER)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    const userNodeId = Date.now().toString();
    const centerWorld = screenToWorld(window.innerWidth / 2 - 144, window.innerHeight / 2 - 60);
    
    const userPos = {
      x: centerWorld.x + (Math.random() * 40 - 20),
      y: centerWorld.y + (Math.random() * 40 - 20)
    };

    const newNode: NodeData = {
      id: userNodeId,
      type: NodeType.USER,
      text: inputValue,
      position: userPos,
      createdAt: Date.now(),
      isPinned: true
    };

    setNodes((prev) => [...prev, newNode]);
    
    // Removed automatic linking as per request for manual linking only
    // if (lastUserNode) { ... }

    generateAISuggestions(inputValue, userNodeId);
    setInputValue('');
  };

  const userNodes = nodes.filter(n => n.type === NodeType.USER);
  const aiNodes = nodes.filter(n => n.type === NodeType.AI);

  const getSuggestionsForNode = (parentId: string) => {
    return aiNodes.filter(n => n.parentId === parentId);
  };

  // Helper to get position of the pending link source
  const pendingFromPos = linkSourceId ? nodes.find(n => n.id === linkSourceId)?.position : undefined;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F7F5F3] text-stone-800">
      
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-4 md:p-6 z-30 pointer-events-none flex justify-between items-start">
        <div>
          <h1 className="text-xl font-light tracking-widest flex items-center gap-3 text-stone-600">
            <Wind className="w-5 h-5" />
            {APP_TITLE}
          </h1>
          <p className="text-xs text-stone-400 mt-1 tracking-wide font-light ml-1 hidden md:block">
             拖曳背景以移動畫布，滾輪縮放。雙擊卡片編輯內容。
          </p>
        </div>
        
        <div className="flex gap-2 pointer-events-auto toolbar-ui">
          {/* Toolbar */}
          <div className="bg-white/50 p-1 rounded-full backdrop-blur-md border border-white/60 shadow-sm flex items-center gap-1 mr-2">
            <button 
              onClick={handleLinkModeToggle} 
              className={`p-2 rounded-full transition-all duration-300 relative ${isLinkingMode ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-200' : 'hover:bg-stone-100 text-stone-500'}`}
              title={isLinkingMode ? "退出連結模式 (Esc)" : "進入連結模式：點選兩個卡片以連接"}
            >
              <LinkIcon className="w-4 h-4" />
              {isLinkingMode && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                  連結模式中
                </span>
              )}
            </button>
            <div className="w-px h-4 bg-stone-200 mx-1" />

            <button 
              onClick={() => setShowSnapshots(true)}
              className="p-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
              title="存檔管理 (Archives)"
            >
              <Folder className="w-4 h-4" />
            </button>
            <button 
              onClick={handleSaveToLocalStorage} 
              className={`p-2 rounded-full transition-all duration-300 ${saveStatus === 'saved' ? 'bg-green-100 text-green-600' : 'hover:bg-stone-100 text-stone-500'}`}
              title="快速儲存 (Quick Save)"
            >
              {saveStatus === 'saved' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            </button>
            <div className="w-px h-4 bg-stone-200 mx-1" />
            <button 
              onClick={handleExportJson} 
              className="p-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
              title="匯出專案 (JSON)"
            >
              <Download className="w-4 h-4" />
            </button>
             <label className="p-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors cursor-pointer" title="匯入專案">
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={handleImportJson} ref={fileInputRef} className="hidden" />
            </label>
             <button 
              onClick={handleExportImage} 
              className="p-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
              title="下載圖片 (PNG)"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>

           <button 
            onClick={recenterCanvas}
            className="bg-white/50 p-2 rounded-full hover:bg-white shadow-sm border border-stone-200 text-stone-500 transition-colors"
            title="回到中心"
          >
            <ScanSearch className="w-4 h-4" />
          </button>
          <div className="bg-white/50 px-3 py-2 rounded-full backdrop-blur-md border border-white/60 shadow-sm flex items-center gap-3">
            <span className="text-xs font-mono text-stone-500">
              {Math.round(viewport.scale * 100)}%
            </span>
            {loadingNodeId && (
              <div className="flex items-center gap-2 text-purple-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-xs font-medium">AI 思考中...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Snapshots Modal */}
      <AnimatePresence>
        {showSnapshots && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/20 backdrop-blur-sm"
            onClick={() => setShowSnapshots(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-stone-100"
            >
              <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <h2 className="text-lg font-medium text-stone-700 flex items-center gap-2">
                  <Folder className="w-5 h-5 text-stone-400" />
                  存檔管理
                </h2>
                <button onClick={() => setShowSnapshots(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 bg-stone-50/30">
                 <button 
                  onClick={handleSaveSnapshot}
                  className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
                 >
                   <Save className="w-4 h-4" />
                   將目前畫布存為新檔案
                 </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {snapshots.length === 0 ? (
                  <div className="text-center py-12 text-stone-400">
                    <Feather className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>尚無存檔紀錄</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {snapshots.map(snap => (
                      <div key={snap.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-100 transition-all">
                        <div className="flex-1 overflow-hidden">
                          <h3 className="font-medium text-stone-700 truncate">{snap.name}</h3>
                          <div className="flex items-center gap-1 text-xs text-stone-400 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(snap.date).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleLoadSnapshot(snap.id)}
                            className="px-3 py-1.5 text-xs font-medium bg-white border border-stone-200 rounded-lg hover:bg-stone-100 text-stone-600"
                          >
                            讀取
                          </button>
                          <button 
                            onClick={(e) => handleDeleteSnapshot(e, snap.id)}
                            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INFINITE CANVAS */}
      <div 
        ref={containerRef}
        className={`absolute inset-0 z-0 overflow-hidden touch-none ${isDraggingCanvas ? 'cursor-grabbing' : isLinkingMode ? 'cursor-crosshair' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div 
          style={{ 
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'absolute'
          }}
        >
          {/* Background Grid */}
          <div 
            className="absolute -inset-[10000px] opacity-[0.03] pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(#44403c 1px, transparent 1px)', 
              backgroundSize: '40px 40px' 
            }} 
          />

          <ConnectionLines 
            nodes={userNodes} 
            links={links} 
            pendingFrom={pendingFromPos}
            mousePos={mousePos}
          />

          <AnimatePresence>
            {userNodes.map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                suggestions={getSuggestionsForNode(node.id)}
                onPositionChange={handleNodePositionChange}
                onTextChange={handleNodeTextChange}
                onPinSuggestion={handlePinNode}
                scale={viewport.scale}
                isLoading={loadingNodeId === node.id}
                isLinkingMode={isLinkingMode}
                isSelectedAsLinkSource={linkSourceId === node.id}
                onNodeClick={handleNodeClick}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Empty State */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.5, duration: 1 }}
            className="text-stone-300 flex flex-col items-center gap-4"
          >
            <Feather className="w-12 h-12 opacity-20" />
            <p className="text-lg font-light tracking-[0.2em]">靜心思考，輸入想法</p>
          </motion.div>
        </div>
      )}

      {/* Bottom Input Bar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40">
        <form 
          onSubmit={handleAddNode}
          className="relative group w-full"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={PLACEHOLDER_TEXT}
            className="relative w-full bg-white/80 backdrop-blur-xl border border-stone-200/50 text-stone-700 placeholder:text-stone-400 rounded-full py-4 pl-6 pr-14 shadow-lg focus:outline-none focus:ring-2 focus:ring-stone-200/50 focus:bg-white transition-all duration-300 font-light text-lg"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || !!loadingNodeId}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-stone-800 text-stone-50 rounded-full flex items-center justify-center hover:bg-stone-700 disabled:opacity-30 disabled:hover:bg-stone-800 transition-all duration-300"
          >
            {loadingNodeId ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
