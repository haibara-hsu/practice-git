import React from 'react';
import { NodeData, Link, Position } from '../types';

interface ConnectionLinesProps {
  nodes: NodeData[];
  links: Link[];
  pendingFrom?: Position;
  mousePos?: Position | null;
}

const ConnectionLines: React.FC<ConnectionLinesProps> = ({ nodes, links, pendingFrom, mousePos }) => {
  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-0">
      {/* Existing Links */}
      {links.map((link) => {
        const startNode = nodes.find((n) => n.id === link.fromId);
        const endNode = nodes.find((n) => n.id === link.toId);

        if (!startNode || !endNode) return null;

        // Anchor points (approximate center of the cards)
        // User Node width ~288px (w-72), AI Node width ~240px (w-60)
        // We use a safe average center or calculate based on type if needed
        const startW = startNode.type === 'USER' ? 144 : 120;
        const startH = 60; // Approx
        const endW = endNode.type === 'USER' ? 144 : 120;
        const endH = 60;

        const startX = startNode.position.x + startW; 
        const startY = startNode.position.y + startH;
        const endX = endNode.position.x + endW;
        const endY = endNode.position.y + endH;

        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const curveFactor = Math.min(dist * 0.4, 150);

        const cp1x = startX + (deltaX > 0 ? curveFactor : -curveFactor);
        const cp1y = startY;
        const cp2x = endX + (deltaX > 0 ? -curveFactor : curveFactor);
        const cp2y = endY;

        const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

        return (
          <g key={link.id}>
            <path
              d={pathData}
              stroke="#d6d3d1" // stone-300
              strokeWidth="2"
              fill="none"
              className="transition-all duration-500"
            />
            <circle cx={endX} cy={endY} r="3" fill="#d6d3d1" />
          </g>
        );
      })}

      {/* Pending Link (Dragging line) */}
      {pendingFrom && mousePos && (
        <path
          d={`M ${pendingFrom.x + 144} ${pendingFrom.y + 60} L ${mousePos.x} ${mousePos.y}`}
          stroke="#a8a29e"
          strokeWidth="2"
          strokeDasharray="5,5"
          fill="none"
        />
      )}
    </svg>
  );
};

export default ConnectionLines;