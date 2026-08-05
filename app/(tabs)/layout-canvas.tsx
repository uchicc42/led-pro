import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/Colors';

const GRID = 24;
const SHAPES = {
  '2x4': { w: 3, h: 1, label: '2×4' },
  '2x2': { w: 2, h: 2, label: '2×2' },
  'highbay': { w: 2, h: 2, label: 'HB', round: true },
  'can': { w: 1, h: 1, label: '●', round: true },
  'vapor': { w: 3, h: 1, label: 'VT' },
};

export default function LayoutCanvasScreen() {
  const { areaId, jobId, areaName } = useLocalSearchParams();
  const [mode, setMode] = useState('old');
  const [tool, setTool] = useState('select');
  const [shape, setShape] = useState('2x4');
  const [fixtures, setFixtures] = useState([]);
  const [selected, setSelected] = useState(null);
  const canvasRef = useRef(null);
  const dragging = useRef(null);

  if (Platform.OS === 'web') {
    return <WebCanvas areaId={areaId} jobId={jobId} areaName={areaName} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push(`/area-entry?areaId=${areaId}&jobId=${jobId}`)}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {areaName} — layout
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🗺</Text>
          <Text style={styles.infoTitle}>Ceiling layout</Text>
          <Text style={styles.infoText}>
            The full layout canvas is available on the browser version of LED Pro for drawing and editing ceiling diagrams.
          </Text>
          <Text style={styles.infoText}>
            On mobile, use this screen to view job notes and reference the area details while on site.
          </Text>
        </View>

        <View style={styles.refCard}>
          <Text style={styles.refLabel}>Area</Text>
          <Text style={styles.refValue}>{areaName}</Text>
        </View>

        <TouchableOpacity
          style={styles.openBrowserBtn}
          onPress={() => router.push(`/area-entry?areaId=${areaId}&jobId=${jobId}`)}
        >
          <Text style={styles.openBrowserBtnText}>← Back to area entry</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function WebCanvas({ areaId, jobId, areaName }) {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('old');
  const [tool, setTool] = useState('select');
  const [shape, setShape] = useState('2x4');
  const [fixtures, setFixtures] = useState([]);
  const [saved, setSaved] = useState(false);
  const dragging = useRef(null);
  const W = 680;
  const H = 340;

  useEffect(() => {
    render();
  }, [fixtures, mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
    };
  }, [fixtures, mode, tool, shape]);

  function render() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx);
    if (mode === 'view') {
      fixtures.forEach(f => {
        const moved = f.gx !== f.oldGx || f.gy !== f.oldGy;
        if (moved) drawFixture(ctx, f, 0.25, false);
        drawFixture(ctx, f, 1, true);
      });
    } else if (mode === 'new') {
      fixtures.forEach(f => {
        const moved = f.gx !== f.oldGx || f.gy !== f.oldGy;
        if (moved) drawFixture(ctx, f, 0.2, false);
        drawFixture(ctx, f, 1, true);
      });
    } else {
      fixtures.forEach(f => drawFixture(ctx, f, 1, false));
    }
  }

  function drawGrid(ctx) {
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += GRID) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += GRID) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  function drawFixture(ctx, f, alpha, isNew) {
    const s = SHAPES[f.type];
    const gx = isNew ? f.gx : f.oldGx;
    const gy = isNew ? f.gy : f.oldGy;
    const px = gx * GRID;
    const py = gy * GRID;
    const pw = s.w * GRID;
    const ph = s.h * GRID;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = isNew ? '#378ADD' : '#9CA3AF';
    ctx.strokeStyle = isNew ? '#185FA5' : '#6B7280';
    ctx.lineWidth = 1;
    if (s.round && s.w === 1) {
      ctx.beginPath();
      ctx.arc(px + GRID / 2, py + GRID / 2, GRID * 0.38, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (s.round) {
      ctx.beginPath();
      ctx.arc(px + pw / 2, py + ph / 2, Math.min(pw, ph) * 0.4, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(px + 2, py + 2, pw - 4, ph - 4, 4);
      ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = isNew ? 1 : alpha * 0.8;
    ctx.fillStyle = isNew ? '#042C53' : '#374151';
    ctx.font = '500 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.label, px + pw / 2, py + ph / 2);
    ctx.globalAlpha = 1;
  }

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function hitTest(px, py) {
    for (let i = fixtures.length - 1; i >= 0; i--) {
      const f = fixtures[i];
      const s = SHAPES[f.type];
      const gx = mode === 'old' ? f.oldGx : f.gx;
      const gy = mode === 'old' ? f.oldGy : f.gy;
      if (px >= gx * GRID && px <= (gx + s.w) * GRID && py >= gy * GRID && py <= (gy + s.h) * GRID) {
        return { fixture: f, gx, gy };
      }
    }
    return null;
  }

  function onDown(e) {
    const { x, y } = getPos(e);
    if (tool !== 'select') {
      const gx = Math.floor(x / GRID);
      const gy = Math.floor(y / GRID);
      const newF = { id: Date.now(), gx, gy, type: shape, oldGx: gx, oldGy: gy };
      setFixtures(prev => {
        const updated = [...prev, newF];
        setTimeout(() => render(), 0);
        return updated;
      });
      return;
    }
    const hit = hitTest(x, y);
    if (hit) {
      dragging.current = {
        fixture: hit.fixture,
        offX: x - hit.gx * GRID,
        offY: y - hit.gy * GRID,
      };
    }
  }

  function onMove(e) {
    if (!dragging.current) return;
    const { x, y } = getPos(e);
    const s = SHAPES[dragging.current.fixture.type];
    let ngx = Math.round((x - dragging.current.offX) / GRID);
    let ngy = Math.round((y - dragging.current.offY) / GRID);
    ngx = Math.max(0, Math.min(Math.floor(W / GRID) - s.w, ngx));
    ngy = Math.max(0, Math.min(Math.floor(H / GRID) - s.h, ngy));
    setFixtures(prev => {
      const updated = prev.map(f => {
        if (f.id !== dragging.current.fixture.id) return f;
        if (mode === 'old') return { ...f, oldGx: ngx, oldGy: ngy };
        return { ...f, gx: ngx, gy: ngy };
      });
      return updated;
    });
  }

  function onUp() { dragging.current = null; }

  function deleteSelected() {
    setFixtures(prev => prev.slice(0, -1));
  }

  function exportImage() {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `${areaName || 'layout'}-ceiling-plan.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  useEffect(() => { render(); }, [fixtures, mode]);

  return (
    <div style={webStyles.page}>
      <div style={webStyles.container}>

        {/* Header */}
        <div style={webStyles.header}>
          <button style={webStyles.backBtn} onClick={() => router.push(`/area-entry?areaId=${areaId}&jobId=${jobId}`)}>← Back</button>
          <div style={webStyles.headerTitle}>{areaName} — ceiling layout</div>
        </div>

        {/* Mode tabs */}
        <div style={webStyles.modeTabs}>
          {[['old', 'Draw old layout'], ['new', 'Edit new layout'], ['view', 'Before / after']].map(([m, label]) => (
            <div
              key={m}
              style={{ ...webStyles.modeTab, ...(mode === m ? webStyles.modeTabActive : {}) }}
              onClick={() => setMode(m)}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={webStyles.toolbar}>
          <div style={webStyles.toolGroup}>
            {[['select', '↖ Select'], ['place', '+ Place']].map(([t, label]) => (
              <div
                key={t}
                style={{ ...webStyles.toolBtn, ...(tool === t ? webStyles.toolBtnActive : {}) }}
                onClick={() => setTool(t)}
              >
                {label}
              </div>
            ))}
          </div>
          <div style={webStyles.toolGroup}>
            {Object.entries(SHAPES).map(([key, s]) => (
              <div
                key={key}
                style={{ ...webStyles.shapeBtn, ...(shape === key ? webStyles.shapeBtnActive : {}) }}
                onClick={() => { setShape(key); setTool('place'); }}
              >
                {s.label}
              </div>
            ))}
          </div>
          <div style={webStyles.toolGroup}>
            <div style={webStyles.toolBtn} onClick={deleteSelected}>🗑 Remove last</div>
          </div>
        </div>

        {/* Legend */}
        <div style={webStyles.legend}>
          <div style={webStyles.legendItem}>
            <div style={{ ...webStyles.legendSwatch, background: '#378ADD' }} />
            <span>New position</span>
          </div>
          <div style={webStyles.legendItem}>
            <div style={{ ...webStyles.legendSwatch, background: '#9CA3AF', opacity: 0.4 }} />
            <span>Old position</span>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: Colors.textTertiary }}>
            {fixtures.length} fixture{fixtures.length !== 1 ? 's' : ''} placed
          </div>
        </div>

        {/* Canvas */}
        <div style={webStyles.canvasWrap}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ width: '100%', height: 'auto', display: 'block', cursor: tool === 'select' ? 'default' : 'crosshair' }}
          />
        </div>

        {/* Mode hint */}
        <div style={webStyles.hint}>
          {mode === 'old' && '📋 Draw the current light positions — place shapes where lights are now'}
          {mode === 'new' && '✏️ Drag shapes to their new positions — ghost shows original location'}
          {mode === 'view' && '👁 Final view — solid shapes are new positions, faded are old positions'}
        </div>

        {/* Actions */}
        <div style={webStyles.actionRow}>
          <button style={webStyles.exportBtn} onClick={exportImage}>
            ⬇ Export as image
          </button>
          <button
            style={{ ...webStyles.saveBtn, background: saved ? Colors.green : Colors.blue }}
            onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          >
            {saved ? '✓ Saved' : 'Save layout'}
          </button>
        </div>
      </div>
    </div>
  );
}

const webStyles = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 900, margin: '0 auto', padding: '32px 32px 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary },
  headerTitle: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  modeTabs: { display: 'flex', gap: 6, marginBottom: 14 },
  modeTab: { padding: '8px 16px', borderRadius: 8, border: '0.5px solid #e0e7ef', background: '#fff', fontSize: 13, cursor: 'pointer', color: Colors.textSecondary },
  modeTabActive: { background: '#534AB7', color: '#fff', borderColor: '#534AB7' },
  toolbar: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  toolGroup: { display: 'flex', gap: 6 },
  toolBtn: { padding: '6px 12px', borderRadius: 8, border: '0.5px solid #e0e7ef', background: '#fff', fontSize: 12, cursor: 'pointer', color: Colors.textSecondary },
  toolBtnActive: { background: '#EEEDFE', color: '#3C3489', borderColor: '#534AB7' },
  shapeBtn: { padding: '6px 12px', borderRadius: 8, border: '0.5px solid #e0e7ef', background: '#fff', fontSize: 12, cursor: 'pointer', color: Colors.textSecondary },
  shapeBtnActive: { background: '#E6F1FB', color: '#0C447C', borderColor: Colors.blue },
  legend: { display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: Colors.textTertiary },
  legendSwatch: { width: 16, height: 16, borderRadius: 3 },
  canvasWrap: { border: '0.5px solid #e0e7ef', borderRadius: 12, overflow: 'hidden', background: '#fff', marginBottom: 10 },
  hint: { fontSize: 12, color: Colors.textTertiary, marginBottom: 16, padding: '8px 12px', background: '#fff', borderRadius: 8, border: '0.5px solid #f0f0f0' },
  actionRow: { display: 'flex', gap: 10 },
  exportBtn: { padding: '11px 20px', background: '#fff', color: Colors.teal, border: `1px solid ${Colors.green}`, borderRadius: 10, fontSize: 13, cursor: 'pointer', fontWeight: '500' },
  saveBtn: { flex: 1, padding: '11px', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: '500', cursor: 'pointer', transition: 'background 0.3s' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { fontSize: 14, color: Colors.blue },
  headerTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  comingSoon: { flex: 1, textAlign: 'center', textAlignVertical: 'center', fontSize: 15, color: Colors.textTertiary, padding: 40, lineHeight: 26 },
  scroll: { padding: 20, paddingBottom: 80 },
  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.borderLight, marginBottom: 16 },
  infoIcon: { fontSize: 40, marginBottom: 12 },
  infoTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 10 },
  infoText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  refCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: Colors.borderLight, marginBottom: 16 },
  refLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  refValue: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  openBrowserBtn: { backgroundColor: Colors.blue, borderRadius: 12, padding: 16, alignItems: 'center' },
  openBrowserBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});