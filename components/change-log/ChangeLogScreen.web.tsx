import { router } from 'expo-router';
import type { CSSProperties } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { formatTime, getIcon, useChangeLog } from './useChangeLog';

// Web-only UI built with DOM elements. Metro only bundles this file for web; native uses ChangeLogScreen.tsx.

export default function ChangeLogScreen() {
  const { jobId, logs, loading, job } = useChangeLog();

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
          <div style={webStyles.headerTitle}>Change log — {job?.name}</div>
        </div>

        {logs.length === 0 ? (
          <div style={webStyles.emptyState}>No changes recorded yet.</div>
        ) : (
          <div style={webStyles.logList}>
            {logs.map(log => (
              <div key={log.id} style={webStyles.logCard}>
                <div style={webStyles.logIcon}>{getIcon(log.change_type)}</div>
                <div style={webStyles.logContent}>
                  <div style={webStyles.logDesc}>{log.description}</div>
                  <div style={webStyles.logMeta}>
                    {log.changed_by_name} · {formatTime(log.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 700, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary },
  headerTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  emptyState: { background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: Colors.textTertiary, border: '0.5px dashed #e0e7ef' },
  logList: { display: 'flex', flexDirection: 'column', gap: 10 },
  logCard: { background: '#fff', borderRadius: 12, padding: '14px 18px', border: '0.5px solid #e0e7ef', display: 'flex', gap: 14, alignItems: 'flex-start' },
  logIcon: { fontSize: 20, flexShrink: 0 },
  logContent: { flex: 1 },
  logDesc: { fontSize: 14, color: Colors.textPrimary, marginBottom: 4 },
  logMeta: { fontSize: 12, color: Colors.textTertiary },
};
