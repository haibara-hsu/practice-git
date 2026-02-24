
import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripHorizontal, Sparkles, Pin } from 'lucide-react';
import { NodeData, Position } from '../types';

interface NodeCardProps {
  node: NodeData; // This is always a USER node
  suggestions: NodeData[]; // AI nodes attached to this user node
  onPositionChange: (id: string, newPos: Position) => void;
  onTextChange: (id: string, newText: string) => void;
  onPinSuggestion: (id: string) => void;
  scale: number;
  isLoading?: boolean;
  isLinkingMode?: boolean;
  isSelectedAsLinkSource?: boolean;
  onNodeClick?: (id: string) => void;
}

// --- SatelliteNode Component (AI Node) ---
interface SatelliteNodeProps {
  node: NodeData;
  index: number;
  total: number;
  isParentHovered: boolean;
  onPin: (id: string) => void;
  onTextChange: (id: string, newText: string) => void;
}

const SatelliteNode: React.FC<SatelliteNodeProps> = ({ 
  node, 
  index, 
  total, 
  isParentHovered, 
  onPin,
  onTextChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync edit text if prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditText(node.text);
    }
  }, [node.text, isEditing]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    // Auto-pin when editing starts so it doesn't disappear
    if (!node.isPinned) {
      onPin(node.id);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    if (editText.trim() && editText.trim() !== node.text) {
      onTextChange(node.id, editText);
    } else {
      setEditText(node.text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(node.text);
    }
  };

  // Helper to determine suggestion position based on angle
  const getSatelliteInfo = (idx: number, count: number, angle?: number) => {
    const safeAngle = angle ?? (idx * (360 / count));
    const normAngle = (safeAngle % 360 + 360) % 360;

    let style: React.CSSProperties = {};
    let arrowStyle: React.CSSProperties = {};

    // Right (approx 0)
    if (normAngle >= 315 || normAngle < 45) {
      style = { 
        left: '100%', top: '50%', 
        transform: 'translateY(-50%)',
        marginLeft: '24px' 
      };
      arrowStyle = {
        left: '-6px', top: '50%',
        transform: 'translateY(-50%) rotate(45deg)'
      };
    } 
    // Bottom (approx 90)
    else if (normAngle >= 45 && normAngle < 135) {
      style = { 
        top: '100%', left: '50%', 
        transform: 'translateX(-50%)',
        marginTop: '24px' 
      };
      arrowStyle = {
        top: '-6px', left: '50%',
        transform: 'translateX(-50%) rotate(45deg)'
      };
    } 
    // Left (approx 180)
    else if (normAngle >= 135 && normAngle < 225) {
      style = { 
        right: '100%', top: '50%', 
        transform: 'translateY(-50%)',
        marginRight: '24px' 
      };
      arrowStyle = {
        right: '-6px', top: '50%',
        transform: 'translateY(-50%) rotate(45deg)'
      };
    } 
    // Top (approx 270)
    else {
      style = { 
        bottom: '100%', left: '50%', 
        transform: 'translateX(-50%)',
        marginBottom: '24px' 
      };
      arrowStyle = {
        bottom: '-6px', left: '50%',
        transform: 'translateX(-50%) rotate(45deg)'
      };
    }

    return { style, arrowStyle };
  };

  const { style, arrowStyle } = getSatelliteInfo(index, total, node.angle);
  const show = isParentHovered || node.isPinned || isEditing;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
      animate={show ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      style={{ position: 'absolute', ...style }}
      className={`w-60 p-4 rounded-xl border backdrop-blur-xl transition-all duration-300 group/satellite
        ${node.isPinned || isEditing
          ? 'bg-white shadow-lg border-purple-400 ring-1 ring-purple-400/50 z-30' 
          : 'bg-purple-50/80 border-purple-100/50 hover:bg-white/90 z-10'}
        ${isEditing ? 'ring-2 ring-purple-500' : ''}
      `}
      onDoubleClick={handleDoubleClick}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Connector Arrow */}
      <div 
        className={`absolute w-3 h-3 border-l border-t transition-colors duration-300 ${node.isPinned ? 'bg-white border-purple-400' : 'bg-inherit border-inherit'}`}
        style={arrowStyle}
      />

      {/* Pin Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPin(node.id);
        }}
        className={`absolute top-2 right-2 p-1 rounded-full transition-all duration-200 z-20 
          ${node.isPinned 
            ? 'text-purple-600 bg-purple-50 hover:bg-purple-100' 
            : 'text-stone-300 opacity-0 group-hover/satellite:opacity-100 hover:text-stone-500 hover:bg-stone-100'
          }`}
        title={node.isPinned ? "取消固定" : "固定此想法"}
      >
        <Pin className={`w-3.5 h-3.5 ${node.isPinned ? 'fill-current' : ''}`} />
      </button>

      <div className="flex items-start gap-2.5 relative z-10">
        <Sparkles className={`w-4 h-4 mt-0.5 shrink-0 ${node.isPinned ? 'text-purple-600' : 'text-purple-400'}`} />
        <div className="flex-1 min-w-0 mr-4">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent resize-none outline-none text-[14px] font-medium leading-relaxed font-serif text-stone-800 placeholder-purple-300"
              rows={Math.max(2, Math.ceil(editText.length / 20))}
            />
          ) : (
             <p className="text-[14px] font-medium leading-relaxed font-serif text-stone-700 italic select-none break-words">
              {node.text}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// --- Main NodeCard Component ---

const NodeCard: React.FC<NodeCardProps> = ({ 
  node, 
  suggestions,
  onPositionChange,
  onTextChange,
  onPinSuggestion,
  scale,
  isLoading,
  isLinkingMode,
  isSelectedAsLinkSource,
  onNodeClick
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text);
  const [isHovered, setIsHovered] = useState(false);

  // Sync edit text if prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditText(node.text);
    }
  }, [node.text, isEditing]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, [isEditing]);

  const handleDragEnd = (_: any, info: any) => {
    const deltaX = info.offset.x / scale;
    const deltaY = info.offset.y / scale;

    const newPos = {
      x: node.position.x + deltaX,
      y: node.position.y + deltaY,
    };
    onPositionChange(node.id, newPos);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLinkingMode) {
      setIsEditing(true);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLinkingMode && onNodeClick) {
      e.stopPropagation();
      onNodeClick(node.id);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    if (editText.trim() && editText.trim() !== node.text) {
      onTextChange(node.id, editText);
    } else {
      setEditText(node.text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(node.text);
    }
  };

  const loadingStyles = isLoading ? "ring-2 ring-purple-200 animate-pulse" : "";
  const linkModeStyles = isLinkingMode ? "cursor-crosshair hover:ring-2 hover:ring-blue-300" : "cursor-grab active:cursor-grabbing";
  const selectedSourceStyles = isSelectedAsLinkSource ? "ring-2 ring-blue-500 shadow-lg shadow-blue-100" : "";

  return (
    <motion.div
      ref={nodeRef}
      style={{ left: node.position.x, top: node.position.y }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      drag={!isEditing && !isLinkingMode}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={(e) => e.stopPropagation()} // Stop propagation to canvas pan
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`absolute w-72 p-6 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 text-stone-800 z-20 group hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-shadow duration-300 node-card
        ${isEditing ? 'cursor-text ring-2 ring-stone-200' : linkModeStyles}
        ${loadingStyles} ${selectedSourceStyles}`}
    >
      <div className="flex justify-between items-start mb-3">
         <div className="w-full" />
         {!isEditing && !isLinkingMode && (
           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripHorizontal className="w-4 h-4 text-stone-300 cursor-grab" />
           </div>
         )}
      </div>
      
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent resize-none outline-none text-lg font-medium leading-relaxed tracking-wide text-stone-800 placeholder-stone-400"
          rows={Math.max(2, Math.ceil(editText.length / 20))} 
          style={{ minHeight: '60px' }}
        />
      ) : (
        <p className="text-lg font-medium leading-relaxed tracking-wide min-h-[60px] select-none break-words">
          {node.text}
        </p>
      )}

      {/* SATELLITE AI SUGGESTIONS */}
      <AnimatePresence>
        {suggestions.map((aiNode, index) => (
          <SatelliteNode 
            key={aiNode.id}
            node={aiNode}
            index={index}
            total={suggestions.length}
            isParentHovered={isHovered}
            onPin={onPinSuggestion}
            onTextChange={onTextChange}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default NodeCard;
