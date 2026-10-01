import { router } from 'expo-router';
import type { CSSProperties } from 'react';
import { Colors } from '../../constants/Colors';
import { useNewJob } from './useNewJob';

// Web-only UI built with DOM elements. Metro only bundles this file for web; native uses NewJobScreen.tsx.

export default function NewJobScreen() {
  const {
    name, setName, location, setLocation, date, setDate, mode, setMode,
    columns, saving, error, isReady, createJob,
  } = useNewJob();

  return (
    <div style={webStyles.page}>
      <div style={webStyles.container}>

        {/* Header */}
        <div style={webStyles.header}>
          <button style={webStyles.backBtn} onClick={() => router.push('/home')}>
            &larr; Back
          </button>
          <div style={webStyles.headerTitle}>New job</div>
        </div>

        <div style={webStyles.card}>

          {/* Job name */}
          <div style={webStyles.fieldGroup}>
            <div style={webStyles.fieldLabel}>Job name *</div>
            <input
              style={webStyles.input}
              placeholder="e.g. Fort Cherry Elementary"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Location */}
          <div style={webStyles.fieldGroup}>
            <div style={webStyles.fieldLabel}>Location / address *</div>
            <input
              style={webStyles.input}
              placeholder="e.g. Fort Cherry, PA"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          {/* Date */}
          <div style={webStyles.fieldGroup}>
            <div style={webStyles.fieldLabel}>Date *</div>
            <input
              style={webStyles.input}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div style={webStyles.divider} />

          {/* Variable columns */}
          <div style={webStyles.sectionLabel}>Variable columns for this job</div>

          {columns.map((col) => (
            <div
              key={col.label}
              style={webStyles.toggleRow}
              onClick={() => col.set(!col.val)}
            >
              <div>
                <div style={webStyles.toggleLabel}>{col.label}</div>
                <div style={webStyles.toggleSub}>{col.sub}</div>
              </div>
              <div style={{ ...webStyles.toggleTrack, background: col.val ? Colors.blue : '#ccc' }}>
                <div style={{ ...webStyles.toggleThumb, transform: col.val ? 'translateX(16px)' : 'translateX(0)' }} />
              </div>
            </div>
          ))}

          <div style={webStyles.divider} />

          {/* Mode selector */}
          <div style={webStyles.sectionLabel}>Starting mode</div>
          <div style={webStyles.modeRow}>
            <div
              style={{ ...webStyles.modeCard, ...(mode === 'counting' ? webStyles.modeCardActive : {}) }}
              onClick={() => setMode('counting')}
            >
              <div style={webStyles.modeIcon}>📋</div>
              <div style={webStyles.modeName}>Counting</div>
              <div style={webStyles.modeSub}>Survey & count lights</div>
            </div>
            <div
              style={{ ...webStyles.modeCard, ...(mode === 'electrician' ? { ...webStyles.modeCardActive, borderColor: Colors.coral } : {}) }}
              onClick={() => setMode('electrician')}
            >
              <div style={webStyles.modeIcon}>🔧</div>
              <div style={webStyles.modeName}>Electrician</div>
              <div style={webStyles.modeSub}>Track installation</div>
            </div>
          </div>

          {error && <div style={webStyles.errorText}>{error}</div>}

          {/* Create button */}
          <button
            style={{
              ...webStyles.createBtn,
              opacity: isReady && !saving ? 1 : 0.5,
              cursor: isReady && !saving ? 'pointer' : 'not-allowed',
            }}
            onClick={createJob}
            disabled={!isReady || saving}
          >
            {saving ? 'Creating...' : 'Create job'}
          </button>
        </div>
      </div>
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 600, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary },
  headerTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  card: { background: '#fff', borderRadius: 16, padding: '32px', border: '0.5px solid #e0e7ef', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 40 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14, border: '0.5px solid #e0e7ef', borderRadius: 8, outline: 'none', color: Colors.textPrimary, fontFamily: 'inherit' },
  divider: { borderTop: '0.5px solid #f0f0f0', margin: '20px 0' },
  sectionLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 },
  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #f5f5f5', cursor: 'pointer' },
  toggleLabel: { fontSize: 13, color: Colors.textPrimary, marginBottom: 2 },
  toggleSub: { fontSize: 11, color: '#aaa' },
  toggleTrack: { width: 36, height: 20, borderRadius: 10, position: 'relative', transition: 'background 0.2s', flexShrink: 0 },
  toggleThumb: { position: 'absolute', top: 3, left: 3, width: 14, height: 14, borderRadius: 7, background: '#fff', transition: 'transform 0.2s' },
  modeRow: { display: 'flex', gap: 12, marginBottom: 24 },
  modeCard: { flex: 1, borderWidth: 1.5, borderStyle: 'solid', borderColor: '#e0e7ef', borderRadius: 12, padding: '16px 12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' },
  modeCardActive: { borderColor: Colors.blue, background: '#E6F1FB' },
  modeIcon: { fontSize: 24, marginBottom: 8 },
  modeName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, marginBottom: 4 },
  modeSub: { fontSize: 11, color: '#aaa' },
  errorText: { color: '#A32D2D', fontSize: 13, marginBottom: 12 },
  createBtn: { width: '100%', padding: '14px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: '500', cursor: 'pointer', marginTop: 8 },
};
