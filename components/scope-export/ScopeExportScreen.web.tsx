import { router } from 'expo-router';
import { useState, type CSSProperties } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { generateHTML, useScopeExport } from './useScopeExport';

// Web-only UI built with DOM elements. Metro only bundles this file for web; native uses ScopeExportScreen.tsx.

export default function ScopeExportScreen() {
  const { jobId, job, areas, loading, totalOld, totalNew } = useScopeExport();
  const [generating, setGenerating] = useState(false);

  function exportPDF() {
    setGenerating(true);
    // Open in a new tab and trigger the browser's print dialog
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(generateHTML(job, areas));
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 500);
    }
    setGenerating(false);
  }

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <div style={webStyles.page}>
      <div style={webStyles.container}>
        <div style={webStyles.header}>
          <button style={webStyles.backBtn} onClick={() => router.push(`/area-list?jobId=${jobId}` as any)}>
            ← Back
          </button>
          <div style={webStyles.headerTitle}>Scope of Work Preview</div>
        </div>

        {/* Summary cards */}
        <div style={webStyles.statRow}>
          <div style={webStyles.statCard}>
            <div style={webStyles.statVal}>{totalOld}</div>
            <div style={webStyles.statLabel}>Current fixtures</div>
          </div>
          <div style={webStyles.statCard}>
            <div style={webStyles.statVal}>{totalNew}</div>
            <div style={webStyles.statLabel}>New fixtures</div>
          </div>
          <div style={webStyles.statCard}>
            <div style={webStyles.statVal}>{areas.length}</div>
            <div style={webStyles.statLabel}>Areas</div>
          </div>
        </div>

        {/* Preview table */}
        <div style={webStyles.card}>
          <div style={webStyles.jobTitle}>{job?.name}</div>
          <div style={webStyles.jobMeta}>{job?.location} · {job?.date && new Date(job.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>

          <table style={webStyles.table}>
            <thead>
              <tr>
                {['Area', 'Old qty', 'Current type', 'New qty', 'New type', 'Lumen', 'Hours', 'Notes'].map(h => (
                  <th key={h} style={webStyles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {areas.map(area => {
                const rows: any[] = area.light_rows || [];
                if (rows.length === 0) return null;
                return rows.map((row, i) => (
                  <tr key={`${area.id}-${i}`} style={{ background: i % 2 === 0 ? '#f9fbff' : '#fff' }}>
                    {i === 0 && (
                      <td rowSpan={rows.length} style={webStyles.tdArea}>{area.name}</td>
                    )}
                    <td style={webStyles.tdQty}>{row.new_addition ? '—' : row.quantity || 0}</td>
                    <td style={webStyles.td}>{row.new_addition ? '(new addition)' : row.light_type_id || '—'}</td>
                    <td style={webStyles.tdQty}>{row.removed_only ? '—' : row.new_quantity || 0}</td>
                    <td style={webStyles.td}>{row.removed_only ? '(removed only)' : row.new_light_type || '—'}</td>
                    <td style={webStyles.tdCenter}>{row.lumen_setting || '—'}</td>
                    <td style={webStyles.tdCenter}>{row.hours_flagged ? `${row.hours_start || ''} – ${row.hours_end || ''}` : '—'}</td>
                    <td style={{ ...webStyles.td, fontSize: 11, color: '#854F0B' }}>
                      {row.removed_only ? '🗑 Remove only' : row.new_addition ? '➕ New addition' : ''}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>

        {/* Export button */}
        <button
          style={{ ...webStyles.exportBtn, opacity: generating ? 0.6 : 1 }}
          onClick={exportPDF}
          disabled={generating}
        >
          {generating ? 'Generating...' : '⬇ Export / Print PDF'}
        </button>
      </div>
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 1000, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary },
  headerTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 12, padding: '16px 20px', border: '0.5px solid #e0e7ef' },
  statVal: { fontSize: 28, fontWeight: '600', color: Colors.blue, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.textTertiary },
  card: { background: '#fff', borderRadius: 14, padding: '24px', border: '0.5px solid #e0e7ef', marginBottom: 20, overflowX: 'auto' },
  jobTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  jobMeta: { fontSize: 13, color: Colors.textTertiary, marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { background: '#185FA5', color: '#fff', padding: '8px 10px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '7px 10px', borderBottom: '0.5px solid #e0e7ef', verticalAlign: 'top' },
  tdQty: { padding: '7px 10px', borderBottom: '0.5px solid #e0e7ef', textAlign: 'center', fontWeight: '500', width: 60 },
  tdCenter: { padding: '7px 10px', borderBottom: '0.5px solid #e0e7ef', textAlign: 'center' },
  tdArea: { padding: '7px 10px', borderBottom: '0.5px solid #e0e7ef', fontWeight: '600', color: '#185FA5', background: '#f4f7fb', borderRight: '2px solid #185FA5', verticalAlign: 'top' },
  exportBtn: { width: '100%', padding: '14px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: '500', cursor: 'pointer' },
};
