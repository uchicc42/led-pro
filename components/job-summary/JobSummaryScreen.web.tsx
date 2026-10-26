import { router } from 'expo-router';
import type { CSSProperties } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { NotOnDevice } from '../ui/not-on-device';
import SummaryCard from './SummaryCard';
import { generateSummaryHTML } from './summary';
import { useJobSummary } from './useJobSummary';

// Web-only UI built with DOM elements. Metro only bundles this file for web; native uses JobSummaryScreen.tsx.

export default function JobSummaryScreen() {
  const { job, totals, loading, notOnDevice, backHref } = useJobSummary();

  // Open in a new tab and trigger the browser's print dialog (save as PDF from there).
  function exportPDF() {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(generateSummaryHTML(job, totals));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }

  if (notOnDevice) return <NotOnDevice backHref={backHref} />;

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <div style={webStyles.page}>
      <div style={webStyles.container}>
        <div style={webStyles.header}>
          <button style={webStyles.backBtn} onClick={() => router.push(backHref as any)}>← Back</button>
          <div style={webStyles.headerTitle}>Job Summary</div>
        </div>

        <SummaryCard job={job} totals={totals} />

        <button style={webStyles.exportBtn} onClick={exportPDF}>📄 Print / save summary PDF</button>
      </div>
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 760, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary },
  headerTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  exportBtn: { width: '100%', padding: 14, background: Colors.blue, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer' },
};
