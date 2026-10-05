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
import { getAreaProgress, getModeLabel, getStatusColor, getStatusLabel, useHome } from './useHome';

// Native UI. The web UI lives in HomeScreen.web.tsx; Metro picks the right file per platform.

export default function HomeScreen() {
  const { jobs, loading, currentUser, greeting, activeJobs, completedToday, installingCount } = useHome({ live: 'realtime' });

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.headerTitle}>LED Pro</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.switchBtnText}>Switch user</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{activeJobs.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{completedToday}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{installingCount}</Text>
            <Text style={styles.statLabel}>Installing</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Active jobs</Text>

        {jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No jobs yet — create your first one!</Text>
          </View>
        ) : (
          jobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => router.push(`/area-list?jobId=${job.id}&role=${currentUser?.role || ''}` as any)}
            >
              <View style={[styles.jobAccent, { backgroundColor: getStatusColor(job) }]} />
              <View style={styles.jobContent}>
                <View style={styles.jobTop}>
                  <Text style={styles.jobName}>{job.name}</Text>
                  <Text style={styles.jobDate}>
                    {new Date(job.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.jobMeta}>
                  <View style={[styles.badge, { backgroundColor: job.mode === 'electrician' ? '#FAECE7' : '#E1F5EE' }]}>
                    <Text style={[styles.badgeText, { color: job.mode === 'electrician' ? '#712B13' : '#085041' }]}>
                      {getModeLabel(job)}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: '#E6F1FB' }]}>
                    <Text style={[styles.badgeText, { color: '#0C447C' }]}>{getStatusLabel(job)}</Text>
                  </View>
                  <Text style={styles.areaCount}>{getAreaProgress(job)}</Text>
                </View>
                {job.location && (
                  <Text style={styles.jobLocation}>📍 {job.location}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.newJobBtn}
          onPress={() => router.push('/new-job')}
        >
          <Text style={styles.newJobText}>+ New job</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 13, color: Colors.textTertiary },
  headerTitle: { fontSize: 24, fontWeight: '600', color: Colors.textPrimary },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: Colors.borderLight },
  statVal: { fontSize: 24, fontWeight: '600', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  emptyState: { backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.borderLight, borderStyle: 'dashed' },
  emptyText: { color: Colors.textTertiary, fontSize: 14 },
  jobCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: Colors.borderLight, flexDirection: 'row', overflow: 'hidden', marginBottom: 10 },
  jobAccent: { width: 5 },
  jobContent: { flex: 1, padding: 14 },
  jobTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  jobName: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  jobDate: { fontSize: 12, color: Colors.textTertiary },
  jobMeta: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '500' },
  areaCount: { fontSize: 12, color: Colors.textSecondary },
  jobLocation: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  newJobBtn: { backgroundColor: Colors.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  newJobText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  switchBtn: { backgroundColor: Colors.bgSecondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.5, borderColor: Colors.borderLight },
  switchBtnText: { fontSize: 12, color: Colors.textSecondary },
});
