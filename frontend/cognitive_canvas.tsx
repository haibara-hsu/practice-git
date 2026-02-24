import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Move, Link2, Save, Cloud } from 'lucide-react'; // 新增 Save, Cloud 圖示

// 設定後端 API 網址
const API_URL = "http://localhost:3000/api/canvas";

const CognitiveCanvas = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
  const [nodeDragStart, setNodeDragStart] = useState({ x: 0, y: 0 });
  const [connections, setConnections] = useState<any[]>([]);
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [connectStart, setConnectStart] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false); // 儲存狀態
  const canvasRef = useRef<HTMLDivElement>(null);

  // Mock AI suggestions in Traditional Chinese
  const aiSuggestions = [
    "這背後的深層原因是什麼？",
    "有沒有完全相反的觀點？",
    "如果這件事失敗了會怎樣？",
    "這與你的核心價值有何關聯？",
    "五年後回看，你會如何評價？",
    "這個想法源自何處？",
    "誰會從中受益？誰會受損？",
    "最簡單的解決方案是什麼？",
    "你最害怕的部分是什麼？",
    "這能否用一句話說清楚？",
    "還有其他可能性嗎？",
    "這符合你的直覺嗎？",
    "下一步該做什麼？",
    "這真的重要嗎？"
  ];

  // --- 1. 新增：讀取資料 (Load) ---
  useEffect(() => {
    const fetchCanvas = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        // 如果後端有資料，取最新的一筆 (index 0 因為後端有 sort 倒序)
        if (data && data.length > 0) {
          const latestCanvas = data[0];
          if (latestCanvas.data) {
            setNodes(latestCanvas.data.nodes || []);
            setConnections(latestCanvas.data.connections || []);
            console.log("已載入畫布資料");
          }
        }
      } catch (error) {
        console.error("讀取失敗:", error);
      }
    };

    fetchCanvas();
  }, []);

  // --- 2. 新增：儲存資料 (Save) ---
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        title: `畫布備份 ${new Date().toLocaleString()}`,
        data: {
          nodes: nodes,
          connections: connections
        }
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("儲存成功！");
      } else {
        alert("儲存失敗");
      }
    } catch (error) {
      console.error("儲存錯誤:", error);
      alert("無法連接伺服器");
    } finally {
      setIsSaving(false);
    }
  };

  const getRandomAISuggestions = () => {
    const shuffled = [...aiSuggestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  };

  const handleAddNode = () => {
    if (!input.trim()) return;

    const centerX = (window.innerWidth / 2 - canvasOffset.x) / scale;
    const centerY = (window.innerHeight / 2 - canvasOffset.y) / scale;
    
    const userPos = {
      x: centerX - 120 + (Math.random() - 0.5) * 200,
      y: centerY - 40 + (Math.random() - 0.5) * 200
    };

    const suggestions = getRandomAISuggestions();
    const distanceVertical = 140;
    const distanceHorizontal = 200;

    const newNode = {
      id: Date.now(),
      text: input,
      position: userPos,
      type: 'user',
      aiNodes: [
        { id: `${Date.now()}-top`, text: suggestions[0], direction: 'top', offset: { x: 0, y: -distanceVertical } },
        { id: `${Date.now()}-right`, text: suggestions[1], direction: 'right', offset: { x: distanceHorizontal, y: 0 } },
        { id: `${Date.now()}-bottom`, text: suggestions[2], direction: 'bottom', offset: { x: 0, y: distanceVertical } },
        { id: `${Date.now()}-left`, text: suggestions[3], direction: 'left', offset: { x: -distanceHorizontal, y: 0 } }
      ]
    };

    setNodes([...nodes, newNode]);
    setInput('');
  };

  const handleCanvasMouseDown = (e: any) => {
    if (e.target.closest('.node-card')) return;
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
  };

  const handleMouseMove = (e: any) => {
    if (isDraggingCanvas) {
      setCanvasOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
    
    if (draggingNodeId !== null) {
      setNodes(prevNodes => prevNodes.map(node => {
        if (node.id === draggingNodeId) {
          return {
            ...node,
            position: {
              x: (e.clientX - canvasOffset.x) / scale - nodeDragStart.x,
              y: (e.clientY - canvasOffset.y) / scale - nodeDragStart.y
            }
          };
        }
        return node;
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: any) => {
    // e.preventDefault(); // React 18+ 建議不要在 passive event 直接 preventDefault，如果報錯可以移除這行
    
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.3, scale + delta), 3);
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const scaleRatio = newScale / scale;
      
      setCanvasOffset(prev => ({
        x: mouseX - (mouseX - prev.x) * scaleRatio,
        y: mouseY - (mouseY - prev.y) * scaleRatio
      }));
      
      setScale(newScale);
    }
  };

  const handleNodeMouseDown = (e: any, nodeId: number, nodePosition: any) => {
    e.stopPropagation();
    
    if (isConnectMode) {
      if (!connectStart) {
        setConnectStart(nodeId);
      } else if (connectStart !== nodeId) {
        // Create connection
        const newConnection = {
          id: `${connectStart}-${nodeId}`,
          from: connectStart,
          to: nodeId
        };
        // Check if connection already exists
        const exists = connections.some(c => 
          (c.from === connectStart && c.to === nodeId) || 
          (c.from === nodeId && c.to === connectStart)
        );
        if (!exists) {
          setConnections([...connections, newConnection]);
        }
        setConnectStart(null);
        setIsConnectMode(false);
      }
      return;
    }
    
    setDraggingNodeId(nodeId);
    const clientX = e.clientX;
    const clientY = e.clientY;
    setNodeDragStart({
      x: (clientX - canvasOffset.x) / scale - nodePosition.x,
      y: (clientY - canvasOffset.y) / scale - nodePosition.y
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // @ts-ignore
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        // @ts-ignore
        canvas.removeEventListener('wheel', handleWheel);
      };
    }
  }, [scale, canvasOffset]);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-200/50">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-light text-slate-800">認知畫布</h1>
            {/* 連線狀態指示 */}
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded text-xs text-green-700">
               <Cloud className="w-3 h-3" />
               <span>已連線至後端</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            
            {/* 新增：儲存按鈕 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                 isSaving ? 'bg-slate-400' : 'bg-green-600 hover:bg-green-700'
              } text-white shadow-md`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? '儲存中...' : '儲存畫布'}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setIsConnectMode(!isConnectMode);
                setConnectStart(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isConnectMode 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'bg-white text-slate-600 border-2 border-slate-300 hover:border-indigo-400'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>{isConnectMode ? (connectStart ? '點擊目標便條' : '點擊起始便條') : '連接便條'}</span>
            </motion.button>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Move className="w-4 h-4" />
              <span>拖曳・縮放</span>
            </div>
            <div className="text-sm text-slate-600 font-medium bg-indigo-100 px-3 py-1 rounded-full">
              {Math.round(scale * 100)}%
            </div>
            <div className="text-sm text-slate-500">
              {nodes.length} 個想法
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="w-full h-full pt-20 pb-24 relative"
        style={{ cursor: isDraggingCanvas ? 'grabbing' : draggingNodeId ? 'grabbing' : 'grab' }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'relative'
          }}
        >
          <svg 
            className="absolute pointer-events-none" 
            style={{ 
              width: '5000px', 
              height: '5000px', 
              left: '-2000px', 
              top: '-2000px',
              overflow: 'visible'
            }}
          >
            {/* User-created connections */}
            {connections.map((conn) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              
              return (
                <motion.line
                  key={conn.id}
                  x1={fromNode.position.x + 120 + 2000}
                  y1={fromNode.position.y + 40 + 2000}
                  x2={toNode.position.x + 120 + 2000}
                  y2={toNode.position.y + 40 + 2000}
                  stroke="#6366f1"
                  strokeWidth="3"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.8 }}
                  transition={{ duration: 0.5 }}
                />
              );
            })}
            
            {/* AI suggestion connections */}
            {nodes.map((node) => 
              node.aiNodes && node.aiNodes.map((aiNode: any) => (
                <motion.line
                  key={`line-${node.id}-${aiNode.id}`}
                  x1={node.position.x + 120 + 2000}
                  y1={node.position.y + 40 + 2000}
                  x2={node.position.x + aiNode.offset.x + 120 + 2000}
                  y2={node.position.y + aiNode.offset.y + 40 + 2000}
                  stroke="#818cf8"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ 
                    pathLength: hoveredNode === node.id ? 1 : 0,
                    opacity: hoveredNode === node.id ? 0.4 : 0
                  }}
                  transition={{ duration: 0.3 }}
                />
              ))
            )}
          </svg>

          {/* User Nodes */}
          <AnimatePresence>
            {nodes.map((node) => (
              <React.Fragment key={node.id}>
                {/* User Node */}
                <motion.div
                  initial={{ scale: 0, opacity: 0, rotate: -10 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    rotate: 0
                  }}
                  exit={{ scale: 0, opacity: 0, rotate: 10 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 120,
                    damping: 15
                  }}
                  style={{
                    position: 'absolute',
                    left: node.position.x,
                    top: node.position.y
                  }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <motion.div
                    className={`node-card bg-white rounded-2xl shadow-lg p-6 w-60 border-2 transition-all ${
                      isConnectMode && connectStart === node.id 
                        ? 'border-indigo-600 ring-4 ring-indigo-200' 
                        : isConnectMode 
                          ? 'border-indigo-300 cursor-pointer hover:border-indigo-500' 
                          : 'border-indigo-200 cursor-move'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id, node.position)}
                  >
                    <p className="text-slate-700 text-base leading-relaxed font-medium pointer-events-none">
                      {node.text}
                    </p>
                  </motion.div>
                </motion.div>

                {/* AI Ghost Nodes - Four Directions */}
                {node.aiNodes && node.aiNodes.map((aiNode: any, index: number) => (
                  <motion.div
                    key={aiNode.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: hoveredNode === node.id ? 1 : 0,
                      opacity: hoveredNode === node.id ? 1 : 0
                    }}
                    transition={{ 
                      duration: 0.3,
                      delay: index * 0.05
                    }}
                    style={{
                      position: 'absolute',
                      left: node.position.x + aiNode.offset.x,
                      top: node.position.y + aiNode.offset.y,
                      pointerEvents: hoveredNode === node.id ? 'auto' : 'none'
                    }}
                  >
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-xl p-4 w-60 border border-indigo-300">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-white/80 mt-0.5 flex-shrink-0" />
                        <p className="text-white text-sm leading-relaxed">
                          {aiNode.text}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </React.Fragment>
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {nodes.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="text-center">
                <Sparkles className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                <p className="text-slate-400 text-lg mb-2">開始記錄你的想法...</p>
                <p className="text-slate-300 text-sm">拖曳畫布・滾輪縮放・拖曳便條</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-sm border-t border-slate-200/50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddNode()}
              placeholder="輸入你的想法..."
              className="flex-1 px-6 py-4 rounded-full border-2 border-slate-200 focus:border-indigo-400 focus:outline-none text-slate-700 bg-white/50 backdrop-blur-sm transition-all"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddNode}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              新增
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CognitiveCanvas;