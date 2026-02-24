
export interface Position {
  x: number;
  y: number;
}

export enum NodeType {
  USER = 'USER',
  AI = 'AI',
}

export interface NodeData {
  id: string;
  type: NodeType;
  text: string;
  position: Position;
  createdAt: number;
  isPinned?: boolean; // If true, node stays visible even when not hovered
  parentId?: string; // ID of the node that generated this suggestion
  angle?: number; // Radial position relative to parent (0-360)
}

export interface Link {
  id: string;
  fromId: string;
  toId: string;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface SnapshotMeta {
  id: string;
  name: string;
  date: number;
}
