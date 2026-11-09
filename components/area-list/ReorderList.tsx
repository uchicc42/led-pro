import { useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, type GestureResponderEvent } from 'react-native';
import { Colors } from '../../constants/Colors';

// Native reorder mode for the area list: drag an area by its ☰ handle, or nudge it with ▲ ▼.
// While dragging, the other areas shift to show where it will land. The web version is
// ReorderList.web.tsx.

const ROW_HEIGHT = 52;
const GAP = 8;
const SLOT = ROW_HEIGHT + GAP;

type Props = {
  areas: any[];
  onMove: (from: number, to: number) => void;
  /** Lets the screen stop scrolling while an area is being dragged. */
  onDraggingChange?: (dragging: boolean) => void;
};

type Drag = { from: number; to: number; startY: number };

export default function ReorderList({ areas, onMove, onDraggingChange }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [dy] = useState(() => new Animated.Value(0));
  const last = areas.length - 1;
  const y = (e: GestureResponderEvent) => e.nativeEvent.pageY;
  const target = (d: Drag, offset: number) => Math.max(0, Math.min(last, d.from + Math.round(offset / SLOT)));

  function start(from: number, e: GestureResponderEvent) {
    dy.setValue(0);
    setDrag({ from, to: from, startY: y(e) });
    onDraggingChange?.(true);
  }

  function move(e: GestureResponderEvent) {
    if (!drag) return;
    const offset = y(e) - drag.startY;
    dy.setValue(offset);
    const to = target(drag, offset);
    if (to !== drag.to) setDrag({ ...drag, to });
  }

  function end(e: GestureResponderEvent) {
    if (!drag) return;
    const to = target(drag, y(e) - drag.startY);
    setDrag(null);
    dy.setValue(0);
    onDraggingChange?.(false);
    if (to !== drag.from) onMove(drag.from, to);
  }

  // Show the list as it will be after the drop.
  const order = areas.map((_, i) => i);
  if (drag) {
    order.splice(drag.from, 1);
    order.splice(drag.to, 0, drag.from);
  }

  return (
    <View style={styles.list}>
      {order.map(i => {
        const area = areas[i];
        const dragging = drag?.from === i;
        const lift = dragging
          ? { transform: [{ translateY: Animated.add(dy, -(drag.to - drag.from) * SLOT) }], zIndex: 10, elevation: 6, shadowOpacity: 0.15 }
          : null;
        return (
          <Animated.View key={area.id} style={[styles.row, dragging && styles.rowDragging, lift]}>
            <View
              style={styles.handle}
              accessibilityLabel="Drag to move"
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={e => start(i, e)}
              onResponderMove={move}
              onResponderRelease={end}
              onResponderTerminate={end}
            >
              <Text style={styles.handleText}>☰</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>{area.name}</Text>
            <TouchableOpacity
              style={styles.arrow}
              disabled={i === 0}
              onPress={() => onMove(i, i - 1)}
              accessibilityLabel={`Move ${area.name} up`}
            >
              <Text style={[styles.arrowText, i === 0 && styles.arrowOff]}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.arrow}
              disabled={i === last}
              onPress={() => onMove(i, i + 1)}
              accessibilityLabel={`Move ${area.name} down`}
            >
              <Text style={[styles.arrowText, i === last && styles.arrowOff]}>▼</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginBottom: 6 },
  row: {
    height: ROW_HEIGHT, marginBottom: GAP, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: Colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, shadowOpacity: 0,
  },
  rowDragging: { borderColor: Colors.blue, backgroundColor: '#F4F8FD' },
  handle: { width: 48, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  handleText: { fontSize: 18, color: Colors.textTertiary },
  name: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  arrow: { width: 44, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 14, color: Colors.blue },
  arrowOff: { color: Colors.borderLight },
});
