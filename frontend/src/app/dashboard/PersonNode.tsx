import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { User, HelpCircle } from 'lucide-react';
import styles from './dashboard.module.css';

interface PersonNodeData {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    nickname?: string | null;
    gender: string;
    birthDate?: string | null;
    estimatedBirthYear?: number | null;
    deathDate?: string | null;
    isUnknown: boolean;
    isLiving: boolean;
    photoUrl?: string | null;
  };
}

export default memo(function PersonNode({ data }: { data: PersonNodeData }) {
  const { person } = data;

  const formatDateDisplay = () => {
    if (person.isUnknown) return '';
    if (person.birthDate) {
      const year = new Date(person.birthDate).getFullYear();
      return person.isLiving ? `${year} – Present` : `${year} – ${person.deathDate ? new Date(person.deathDate).getFullYear() : 'Deceased'}`;
    }
    if (person.estimatedBirthYear) {
      return person.isLiving ? `Est. ${person.estimatedBirthYear} – Present` : `Est. ${person.estimatedBirthYear} – Deceased`;
    }
    return person.isLiving ? 'Unknown – Present' : 'Deceased';
  };

  const getGenderStyles = () => {
    if (person.isUnknown) {
      return {
        cardClass: styles.nodeUnknown,
        avatarClass: styles.avatarUnknown,
      };
    }
    if (person.gender === 'FEMALE') {
      return {
        cardClass: styles.nodeFemale,
        avatarClass: styles.avatarFemale,
      };
    }
    return {
      cardClass: styles.nodeMale,
      avatarClass: styles.avatarMale,
    };
  };

  const genderStyles = getGenderStyles();

  return (
    <div className={`${styles.nodeCard} ${genderStyles.cardClass} ${(person as any).isFaded ? styles.nodeFaded : ''}`}>
      {/* Target handle for parent-to-child connections (Top) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: '#6366f1', width: '8px', height: '8px' }}
      />

      {/* Handles for partner connections (Left & Right) */}
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{ top: '50%', background: '#fbbf24', width: '6px', height: '6px' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ top: '50%', background: '#fbbf24', width: '6px', height: '6px' }}
      />

      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ top: '50%', background: '#fbbf24', width: '6px', height: '6px' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ top: '50%', background: '#fbbf24', width: '6px', height: '6px' }}
      />

      <div className={styles.nodeBody}>
        {/* Photo / Avatar */}
        <div className={`${styles.nodeAvatar} ${genderStyles.avatarClass}`}>
          {person.isUnknown ? (
            <HelpCircle size={18} />
          ) : person.photoUrl ? (
            <img src={person.photoUrl} alt={person.firstName} className={styles.nodePhoto} />
          ) : (
            <User size={18} />
          )}
        </div>

        {/* Content details */}
        <div className={styles.nodeDetails}>
          <div className={styles.nodeName}>
            {person.isUnknown ? (
              <span className={styles.italicUnknown}>[Unknown Person]</span>
            ) : (
              `${person.firstName} ${person.lastName}`
            )}
            {person.nickname && !person.isUnknown && (
              <span className={styles.nodeNickname}> ({person.nickname})</span>
            )}
          </div>
          <div className={styles.nodeLifespan}>{formatDateDisplay()}</div>
        </div>

        {/* Living status dot */}
        {!person.isUnknown && (
          <div className={styles.statusContainer}>
            <span
              className={`${styles.statusDot} ${
                person.isLiving ? styles.statusLiving : styles.statusDeceased
              }`}
              title={person.isLiving ? 'Living' : 'Deceased'}
            />
          </div>
        )}
      </div>

      {/* Source handle for parent-to-child connections (Bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#6366f1', width: '8px', height: '8px' }}
      />
    </div>
  );
});
