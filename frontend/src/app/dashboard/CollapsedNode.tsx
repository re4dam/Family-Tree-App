import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus } from 'lucide-react';
import styles from './dashboard.module.css';

interface CollapsedNodeData {
  label: string;
  targetId: string;
  onExpand: (id: string) => void;
}

export default memo(function CollapsedNode({ data }: { data: CollapsedNodeData }) {
  return (
    <div 
      className={`${styles.nodeCard} ${styles.nodeCollapsed}`}
      onClick={(e) => {
        e.stopPropagation();
        data.onExpand(data.targetId);
      }}
      title="Click to expand branch"
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: '#6366f1', width: '6px', height: '6px' }}
      />
      <div className={styles.collapsedContent}>
        <Plus size={14} className={styles.collapsedPlusIcon} />
        <span className={styles.collapsedText}>
          {data.label || 'Expand Relatives'}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#6366f1', width: '6px', height: '6px' }}
      />
    </div>
  );
});
