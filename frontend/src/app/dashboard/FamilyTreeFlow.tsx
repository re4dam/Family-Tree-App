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
  Edge,
  ReactFlowProvider,
  useReactFlow
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
  onSelectPerson: (id: string) => void;
  focusedNodeId: string | null;
}

function FlowCanvas({ people, relationships, onSelectPerson, focusedNodeId }: FamilyTreeFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

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

  // Center and focus on a node when focusedNodeId changes
  useEffect(() => {
    if (focusedNodeId && nodes.some(n => n.id === focusedNodeId)) {
      const timer = setTimeout(() => {
        fitView({ 
          nodes: [{ id: focusedNodeId }], 
          duration: 800,
          minZoom: 0.8,
          maxZoom: 1.2
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [focusedNodeId, nodes, fitView]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div className={styles.graphViewport}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onNodeClick={(_, node) => onSelectPerson(node.id)}
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
              type="button"
              className={styles.resetLayoutBtn}
              onClick={calculateLayout}
              title="Recalculate and reset tree layout positions"
            >
              <RefreshCw size={14} />
              Reset View & Layout
            </button>
          </Panel>
          <Panel position="bottom-right">
            <div className={styles.legendContainer}>
              <h4 className={styles.legendTitle}>Relationship Legend</h4>
              <div className={styles.legendGrid}>
                <div className={styles.legendSection}>
                  <h5>Parent-Child</h5>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendLine} ${styles.lineBio}`}></span>
                    <span>Biological</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendLine} ${styles.lineAdoptive}`}></span>
                    <span>Adoptive</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendLine} ${styles.lineStep}`}></span>
                    <span>Step</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendLine} ${styles.lineFoster}`}></span>
                    <span>Foster</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendLine} ${styles.lineGuardian}`}></span>
                    <span>Guardian</span>
                  </div>
                </div>
                <div className={styles.legendSection}>
                  <h5>Partnership</h5>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendLine} ${styles.lineMarried}`}></span>
                    <span>Married</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendLine} ${styles.lineDivorced}`}></span>
                    <span>Divorced</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendLine} ${styles.lineSeparated}`}></span>
                    <span>Separated</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendLine} ${styles.lineWidowed}`}></span>
                    <span>Widowed</span>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

export default function FamilyTreeFlow(props: FamilyTreeFlowProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
