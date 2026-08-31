import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Platform,
    SafeAreaView, ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../supabase';

export default function ChangeLogScreen() {
  const { jobId } = useLocalSearchParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);

  useEffect(() => {
    loadAll();
  }, [jobId]);

  async function loadAll() {
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (jobData) setJob(jobData);

    const { data } = await supabase
      .from('change_log')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    if (data) setLogs(data);
    setLoading(false);
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  }

  function getIcon(changeType) {
    switch (changeType) {
      case 'area_updated': return '✏️';
      case 'area_complete': return '✅';
      case 'job_complete': return '🎉';
      case 'job_note': return '📝';
      default: return '📋';
    }
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.page}>
        <div style={webStyles.container}>
          <div style={webStyles.header}>
            <button style={webStyles.backBtn} onClick={() => router.push(`/area-list?jobId=${jobId}`)}>
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(`/area-list?jobId=${jobId}`)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change log</Text>
          <View style={{ width: 50 }} />
        </View>

        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No changes recorded yet.</Text>
          </View>
        ) : (
          logs.map(log => (
            <View key={log.id} style={styles.logCard}>
              <Text style={styles.logIcon}>{getIcon(log.change_type)}</Text>
              <View style={styles.logContent}>
                <Text style={styles.logDesc}>{log.description}</Text>
                <Text style={styles.logMeta}>{log.changed_by_name} · {formatTime(log.created_at)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const webStyles = {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { padding: 20, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { fontSize: 14, color: Colors.blue },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  emptyState: { backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.borderLight, borderStyle: 'dashed' },
  emptyText: { color: Colors.textTertiary, fontSize: 14 },
  logCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: Colors.borderLight, flexDirection: 'row', gap: 12, marginBottom: 10 },
  logIcon: { fontSize: 20 },
  logContent: { flex: 1 },
  logDesc: { fontSize: 14, color: Colors.textPrimary, marginBottom: 4 },
  logMeta: { fontSize: 12, color: Colors.textTertiary },
});