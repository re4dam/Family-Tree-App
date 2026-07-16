'use client';

import React, { useState, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Panel,
  useNodesState, 
  useEdgesState,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PersonNode from './PersonNode';
import FamilyEdge from './FamilyEdge';
import { getLayoutedElements, GraphQLPerson, GraphQLRelationship } from './layoutUtils';
import styles from './dashboard.module.css';
import { RefreshCw } from 'lucide-react';

const NODE_TYPES = {
  personNode: PersonNode,
};

const EDGE_TYPES = {
  familyEdge: FamilyEdge,
};

interface FamilyTreeFlowProps {
  people: GraphQLPerson[];
  relationships: GraphQLRelationship[];
}

export default function FamilyTreeFlow({ people, relationships }: FamilyTreeFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const calculateLayout = () => {
    if (people && relationships) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        people,
        relationships
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  };

  // Calculate layout whenever data changes
  useEffect(() => {
    calculateLayout();
  }, [people, relationships]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div className={styles.graphViewport}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
          nodesConnectable={false}
          nodesDraggable={true}
          elementsSelectable={true}
        >
          <Background color="rgba(255, 255, 255, 0.05)" gap={20} size={1} />
          <Controls />
          <Panel position="top-right">
            <button 
              className={styles.resetLayoutBtn}
              onClick={calculateLayout}
              title="Recalculate and reset tree layout positions"
            >
              <RefreshCw size={14} />
              Reset View & Layout
            </button>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
