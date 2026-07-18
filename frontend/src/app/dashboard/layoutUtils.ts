import dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';

export interface GraphQLPerson {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string | null;
  gender: string;
  birthDate?: string | null;
  estimatedBirthYear?: number | null;
  deathDate?: string | null;
  birthPlace?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  isUnknown: boolean;
  isLiving: boolean;
}

export interface GraphQLRelationship {
  id: string;
  type: 'PARENT_CHILD' | 'PARTNER';
  sourcePersonId: string;
  targetPersonId: string;
  parentChildType?: string | null;
  partnerType?: string | null;
  startDate?: string | null;
  startYear?: number | null;
  endDate?: string | null;
  endYear?: number | null;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 90;

export function getLayoutedElements(
  people: GraphQLPerson[],
  relationships: GraphQLRelationship[],
  onCollapseNode?: (id: string) => void
) {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 80, // Horizontal gap
    ranksep: 100, // Vertical gap
  });

  // 1. Add all nodes to Dagre
  people.forEach((person) => {
    const isPlaceholder = person.id.startsWith('collapsed-') || (person as any).isCollapsedPlaceholder;
    const w = isPlaceholder ? 180 : NODE_WIDTH;
    const h = isPlaceholder ? 38 : NODE_HEIGHT;
    g.setNode(person.id, { width: w, height: h });
  });

  // 2. Add edges to Dagre
  // We add PARENT_CHILD edges for ranking.
  // We do NOT add PARTNER edges to Dagre so that they don't introduce vertical rank constraints.
  relationships.forEach((rel) => {
    if (rel.type === 'PARENT_CHILD') {
      g.setEdge(rel.sourcePersonId, rel.targetPersonId);
    }
  });

  // 3. Compute layout
  dagre.layout(g);

  // 4. Create positioned React Flow nodes
  const nodes: Node[] = people.map((person) => {
    const dagreNode = g.node(person.id);
    const isPlaceholder = person.id.startsWith('collapsed-') || (person as any).isCollapsedPlaceholder;
    const w = isPlaceholder ? 180 : NODE_WIDTH;
    const h = isPlaceholder ? 38 : NODE_HEIGHT;

    return {
      id: person.id,
      type: isPlaceholder ? 'collapsedNode' : 'personNode',
      position: {
        x: dagreNode.x - w / 2,
        y: dagreNode.y - h / 2,
      },
      data: isPlaceholder ? {
        label: `Expand ${person.firstName} ${person.lastName}`,
        targetId: person.id.replace('collapsed-', ''),
        onExpand: (person as any).onExpand,
      } : { person },
    };
  });

  // 5. Create React Flow edges with dynamic handles
  const edges: Edge[] = relationships.map((rel) => {
    const isParentChild = rel.type === 'PARENT_CHILD';
    const sourceNode = nodes.find((n) => n.id === rel.sourcePersonId);
    const targetNode = nodes.find((n) => n.id === rel.targetPersonId);

    let sourceHandle = 'bottom';
    let targetHandle = 'top';

    if (!isParentChild && sourceNode && targetNode) {
      // For partners, determine which node is to the left
      const isSourceLeft = sourceNode.position.x < targetNode.position.x;
      sourceHandle = isSourceLeft ? 'right-source' : 'left-source';
      targetHandle = isSourceLeft ? 'left-target' : 'right-target';
    }

    return {
      id: rel.id,
      source: rel.sourcePersonId,
      target: rel.targetPersonId,
      type: 'familyEdge',
      sourceHandle,
      targetHandle,
      data: {
        type: rel.type,
        parentChildType: rel.parentChildType,
        partnerType: rel.partnerType,
        startYear: rel.startYear,
        endYear: rel.endYear,
        isFaded: (rel as any).isFaded,
        onCollapse: onCollapseNode,
        targetPersonId: rel.targetPersonId,
      },
    };
  });

  return { nodes, edges };
}
