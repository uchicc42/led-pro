import { router } from 'expo-router';
import type { CSSProperties } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { getAreaProgress, getModeLabel, getStatusColor, getStatusLabel, useHome } from './useHome';

// Web-only UI built with DOM elements. Metro only bundles this file for web; native uses HomeScreen.tsx.

function readStoredSession() {
  if (typeof window === 'undefined') return null; // static render runs in Node

  try {
    const stored = localStorage.getItem('led_pro_current_session');
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

export default function HomeScreen() {
  const { jobs, loading, currentUser, activeJobs, completedToday, installingCount } =
    useHome({ live: 'poll', initialUser: readStoredSession });

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

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
              style={{ ...webStyles.newJobBtn, background: '#f4f7fb', color: Colors.textSecondary, border: '0.5px solid #e0e7ef' }}
              onClick={() => router.push('/settings')}
            >
              Settings
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
            <div style={webStyles.statVal}>{installingCount}</div>
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
              <div
                key={job.id}
                style={webStyles.jobCard}
                onClick={() => router.push(`/area-list?jobId=${job.id}&role=${currentUser?.role || ''}` as any)}
              >
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

const webStyles: Record<string, CSSProperties> = {
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
