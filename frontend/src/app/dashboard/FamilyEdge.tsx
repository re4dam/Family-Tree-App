import React from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';
import styles from './dashboard.module.css';

interface FamilyEdgeData {
  type: 'PARENT_CHILD' | 'PARTNER';
  parentChildType?: string | null;
  partnerType?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  isFaded?: boolean;
  onCollapse?: (targetPersonId: string) => void;
  targetPersonId?: string;
}

export default function FamilyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  target,
}: EdgeProps) {
  const edgeData = data as FamilyEdgeData | undefined;
  const isParentChild = edgeData?.type === 'PARENT_CHILD';

  // We use getSmoothStepPath for clean orthogonal lines
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  // Determine label and styling
  let labelText = '';
  let isDoubleLine = false;
  let strokeDasharray = undefined;
  let strokeColor = 'var(--border-color, #4b5563)';
  let labelBadgeClass = styles.edgeLabelDefault;

  if (isParentChild) {
    const pct = edgeData?.parentChildType;
    if (pct && pct !== 'BIOLOGICAL') {
      labelText = pct.toLowerCase().replace('_', ' ');
      labelBadgeClass = styles.edgeLabelParentChild;
      if (pct === 'ADOPTIVE') {
        strokeDasharray = '5,5';
        strokeColor = '#818cf8'; // indigo
      } else if (pct === 'STEP') {
        strokeDasharray = '2,3';
        strokeColor = '#a78bfa'; // violet
      } else if (pct === 'FOSTER') {
        strokeDasharray = '8,4';
        strokeColor = '#34d399'; // emerald
      } else {
        strokeDasharray = '4,4';
        strokeColor = '#fb7185'; // rose
      }
    } else {
      // Biological
      strokeColor = '#6366f1'; // primary indigo
    }
  } else {
    // Partner relationship (Spouse)
    isDoubleLine = true;
    const pt = edgeData?.partnerType;
    const years =
      edgeData?.startYear || edgeData?.endYear
        ? ` (${edgeData.startYear || '?'}${edgeData.endYear ? `–${edgeData.endYear}` : ''})`
        : '';

    if (pt) {
      labelText = pt.toLowerCase().replace('_', ' ') + years;
      if (pt === 'MARRIED') {
        strokeColor = '#fbbf24'; // amber
      } else if (pt === 'DIVORCED') {
        strokeColor = '#ef4444'; // red
        labelBadgeClass = styles.edgeLabelDivorced;
      } else if (pt === 'SEPARATED') {
        strokeColor = '#f97316'; // orange
        labelBadgeClass = styles.edgeLabelSeparated;
      } else if (pt === 'WIDOWED') {
        strokeColor = '#9ca3af'; // gray
        labelBadgeClass = styles.edgeLabelWidowed;
      } else {
        strokeColor = '#fbbf24';
        labelBadgeClass = styles.edgeLabelPartner;
      }
    } else {
      labelText = 'partner' + years;
      strokeColor = '#fbbf24';
    }
  }

  const isFaded = edgeData?.isFaded;
  const showCollapseButton = isParentChild && edgeData?.onCollapse && edgeData?.targetPersonId && !target.startsWith('collapsed-');
  const buttonY = labelText ? labelY + 18 : labelY;

  // Draw edge
  if (isDoubleLine) {
    // To draw a double line, we stack a thick outer line and a slightly thinner background-colored inner line.
    return (
      <>
        {/* Outer border (Double line thickness) */}
        <path
          id={id}
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={5}
          style={{ ...style, opacity: isFaded ? 0.15 : 1 }}
          className="react-flow__edge-path"
        />
        {/* Inner background mask (creates the double line gap) */}
        <path
          id={`${id}-mask`}
          d={edgePath}
          fill="none"
          stroke="var(--background-color, #0b0f19)"
          strokeWidth={2.2}
          style={{ ...style, opacity: isFaded ? 0.15 : 1 }}
        />
        {labelText && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: 'all',
                opacity: isFaded ? 0.15 : 1,
              }}
              className={`${styles.edgeLabelBadge} ${labelBadgeClass}`}
            >
              {labelText}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: 2.5,
          strokeDasharray,
          opacity: isFaded ? 0.15 : 1,
        }}
        markerEnd={markerEnd}
      />
      {labelText && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              opacity: isFaded ? 0.15 : 1,
            }}
            className={`${styles.edgeLabelBadge} ${labelBadgeClass}`}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
      {showCollapseButton && (
        <EdgeLabelRenderer>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              edgeData?.onCollapse?.(edgeData.targetPersonId!);
            }}
            className={styles.edgeCollapseBtn}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${buttonY}px)`,
              pointerEvents: 'all',
              zIndex: 5,
            }}
            title="Collapse branch"
          >
            -
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
