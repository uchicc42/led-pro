import { useState, type CSSProperties } from 'react';
import { Colors } from '../../constants/Colors';

// Web reorder mode for the area list: drag an area with the mouse, or nudge it with ▲ ▼ (which
// also works on touch screens, where browsers don't support drag and drop). While dragging, the
// other areas shift to show where it will land. The native version is ReorderList.tsx.

type Props = {
  areas: any[];
  onMove: (from: number, to: number) => void;
};

export default function ReorderList({ areas, onMove }: Props) {
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const last = areas.length - 1;

  // Show the list as it will be after the drop.
  const order = areas.map((_, i) => i);
  if (drag) {
    order.splice(drag.from, 1);
    order.splice(drag.to, 0, drag.from);
  }

  return (
    <div style={webStyles.list}>
      {order.map((i, position) => {
        const area = areas[i];
        const dragging = drag?.from === i;
        return (
          <div
            key={area.id}
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDrag({ from: i, to: i }); }}
            onDragOver={e => {
              e.preventDefault();
              if (drag && drag.to !== position) setDrag({ ...drag, to: position });
            }}
            onDrop={e => {
              e.preventDefault();
              if (drag && drag.to !== drag.from) onMove(drag.from, drag.to);
              setDrag(null);
            }}
            onDragEnd={() => setDrag(null)}
            style={{ ...webStyles.row, ...(dragging ? webStyles.rowDragging : {}) }}
          >
            <span style={webStyles.handle} title="Drag to move">⠿</span>
            <span style={webStyles.name}>{area.name}</span>
            <button
              style={{ ...webStyles.arrow, ...(i === 0 ? webStyles.arrowOff : {}) }}
              disabled={i === 0}
              onClick={() => onMove(i, i - 1)}
              aria-label={`Move ${area.name} up`}
            >
              ▲
            </button>
            <button
              style={{ ...webStyles.arrow, ...(i === last ? webStyles.arrowOff : {}) }}
              disabled={i === last}
              onClick={() => onMove(i, i + 1)}
              aria-label={`Move ${area.name} down`}
            >
              ▼
            </button>
          </div>
        );
      })}
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
  list: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  row: {
    display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 12,
    border: '0.5px solid #e0e7ef', padding: '8px 10px', cursor: 'grab', userSelect: 'none',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  rowDragging: { opacity: 0.5, border: `1px dashed ${Colors.blue}`, background: '#F4F8FD' },
  handle: { fontSize: 18, color: Colors.textTertiary, padding: '0 8px', cursor: 'grab' },
  name: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  arrow: {
    width: 36, height: 32, borderRadius: 8, border: '0.5px solid #e0e7ef', background: Colors.bgSecondary,
    color: Colors.blue, fontSize: 12, cursor: 'pointer',
  },
  arrowOff: { color: '#c8d3df', cursor: 'default' },
};
