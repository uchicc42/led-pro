import { router } from 'expo-router';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { formatTime, getIcon, useChangeLog } from './useChangeLog';

// Native UI. The web UI lives in ChangeLogScreen.web.tsx; Metro picks the right file per platform.

export default function ChangeLogScreen() {
  const { jobId, logs, loading } = useChangeLog();

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(`/area-list?jobId=${jobId}` as any)}>
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
