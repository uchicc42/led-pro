import { router } from 'expo-router';
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

export default function HomeScreen() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadJobs() {
    const { data } = await supabase
      .from('jobs')
      .select(`
        *,
        created_by:team_members(name, initials, color),
        areas(id, is_complete)
      `)
      .order('created_at', { ascending: false });
    if (data) setJobs(data);
    setLoading(false);
  }

  useEffect(() => {
    loadJobs();

    if (Platform.OS !== 'web') {
      const subscription = supabase
        .channel('jobs-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
          loadJobs();
        })
        .subscribe();
      return () => supabase.removeChannel(subscription);
    } else {
      const interval = setInterval(loadJobs, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  function getStatusColor(job) {
    if (job.status === 'complete') return Colors.green;
    if (job.mode === 'electrician') return Colors.coral;
    return Colors.blue;
  }

  function getStatusLabel(job) {
    if (job.status === 'complete') return 'Complete';
    if (job.mode === 'electrician') return 'Installing';
    return 'In progress';
  }

  function getModeLabel(job) {
    return job.mode === 'electrician' ? 'Electrician' : 'Counting';
  }

  function getAreaProgress(job) {
    if (!job.areas || job.areas.length === 0) return '0 areas';
    const done = job.areas.filter(a => a.is_complete).length;
    const total = job.areas.length;
    return `${done} / ${total} areas`;
  }

  const activeJobs = jobs.filter(j => j.status !== 'complete');
  const completedToday = jobs.filter(j => {
    const today = new Date().toDateString();
    return new Date(j.created_at).toDateString() === today;
  }).length;

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
            <div>
              <div style={webStyles.greeting}>Good morning,</div>
              <div style={webStyles.headerTitle}>LED Pro Dashboard</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ ...webStyles.newJobBtn, background: '#f4f7fb', color: Colors.textSecondary, border: '0.5px solid #e0e7ef' }}
                onClick={() => router.replace('/')}
              >
                Switch user
              </button>
              <button
                style={webStyles.newJobBtn}
                onClick={() => router.push('/new-job')}
              >
                + New job
              </button>
            </div>
          </div>

          <div style={webStyles.statRow}>
            <div style={webStyles.statCard}>
              <div style={webStyles.statVal}>{activeJobs.length}</div>
              <div style={webStyles.statLabel}>Active jobs</div>
            </div>
            <div style={webStyles.statCard}>
              <div style={webStyles.statVal}>{completedToday}</div>
              <div style={webStyles.statLabel}>Started today</div>
            </div>
            <div style={webStyles.statCard}>
              <div style={webStyles.statVal}>
                {jobs.filter(j => j.mode === 'electrician' && j.status !== 'complete').length}
              </div>
              <div style={webStyles.statLabel}>Installing</div>
            </div>
          </div>

          <div style={webStyles.sectionLabel}>Active jobs</div>
          {jobs.length === 0 ? (
            <div style={webStyles.emptyState}>
              No jobs yet — create your first one!
            </div>
          ) : (
            <div style={webStyles.jobsGrid}>
              {jobs.map((job) => (
                <div key={job.id} style={webStyles.jobCard} onClick={() => router.push(`/area-list?jobId=${job.id}`)}>
                  <div style={{ ...webStyles.jobAccent, background: getStatusColor(job) }} />
                  <div style={webStyles.jobCardContent}>
                    <div style={webStyles.jobTop}>
                      <div style={webStyles.jobName}>{job.name}</div>
                      <div style={webStyles.jobDate}>
                        {new Date(job.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div style={webStyles.jobMeta}>
                      <span style={{
                        ...webStyles.badge,
                        background: job.mode === 'electrician' ? '#FAECE7' : '#E1F5EE',
                        color: job.mode === 'electrician' ? '#712B13' : '#085041',
                      }}>
                        {getModeLabel(job)}
                      </span>
                      <span style={{ ...webStyles.badge, background: '#E6F1FB', color: '#0C447C' }}>
                        {getStatusLabel(job)}
                      </span>
                      <span style={webStyles.areaCount}>{getAreaProgress(job)}</span>
                    </div>
                    {job.location && (
                      <div style={webStyles.jobLocation}>📍 {job.location}</div>
                    )}
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
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.headerTitle}>LED Pro</Text>
          </View>
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.switchBtnText}>Switch user</Text>
          </TouchableOpacity>
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
            <Text style={styles.statVal}>
              {jobs.filter(j => j.mode === 'electrician' && j.status !== 'complete').length}
            </Text>
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
            <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => router.push(`/area-list?jobId=${job.id}`)}>
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

const webStyles = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  container: { maxWidth: 900, margin: '0 auto', padding: '40px 32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greeting: { fontSize: 13, color: Colors.textTertiary, marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '600', color: Colors.textPrimary },
  newJobBtn: { padding: '10px 20px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: '500', cursor: 'pointer' },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 },
  statCard: { background: '#fff', borderRadius: 14, padding: '20px 24px', border: '0.5px solid #e0e7ef', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  statVal: { fontSize: 32, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 13, color: Colors.textTertiary },
  sectionLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 },
  emptyState: { background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', color: Colors.textTertiary, border: '0.5px dashed #e0e7ef' },
  jobsGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
  jobCard: { background: '#fff', borderRadius: 14, border: '0.5px solid #e0e7ef', display: 'flex', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer' },
  jobAccent: { width: 5, flexShrink: 0 },
  jobCardContent: { flex: 1, padding: '16px 20px' },
  jobTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  jobName: { fontSize: 16, fontWeight: '500', color: Colors.textPrimary },
  jobDate: { fontSize: 12, color: Colors.textTertiary },
  jobMeta: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 },
  badge: { fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: '500' },
  areaCount: { fontSize: 12, color: Colors.textSecondary },
  jobLocation: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
};

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