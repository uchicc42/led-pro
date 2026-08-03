import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    SafeAreaView, ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../supabase';

export default function AreaListScreen() {
  const { jobId } = useLocalSearchParams();
  const [job, setJob] = useState(null);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingArea, setAddingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadJob();
    loadAreas();
    loadCurrentUser();

    if (Platform.OS !== 'web') {
      const subscription = supabase
        .channel('areas-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'areas' }, () => {
          loadAreas();
        })
        .subscribe();
      return () => supabase.removeChannel(subscription);
    } else {
      const interval = setInterval(loadAreas, 8000);
      return () => clearInterval(interval);
    }
  }, [jobId]);

  async function loadCurrentUser() {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .limit(1)
      .single();
    if (data) setCurrentUser(data);
  }

  async function loadJob() {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (data) setJob(data);
  }

  async function loadAreas() {
    const { data } = await supabase
      .from('areas')
      .select(`
        *,
        entered_by:team_members(name, initials, color),
        light_rows(id)
      `)
      .eq('job_id', jobId)
      .order('created_at');
    if (data) setAreas(data);
    setLoading(false);
  }

  async function addArea() {
    if (!newAreaName.trim()) return;
    const { error } = await supabase
      .from('areas')
      .insert({
        job_id: jobId,
        name: newAreaName.trim(),
        entered_by: currentUser?.id,
        is_complete: false,
      });
    if (!error) {
      setNewAreaName('');
      setAddingArea(false);
      loadAreas();
    }
  }

  async function toggleComplete(area) {
    await supabase
      .from('areas')
      .update({ is_complete: !area.is_complete })
      .eq('id', area.id);
    loadAreas();
  }

  function getFilteredAreas() {
    switch (filter) {
      case 'todo': return areas.filter(a => !a.is_complete);
      case 'complete': return areas.filter(a => a.is_complete);
      case 'mine': return areas.filter(a => a.entered_by?.name === currentUser?.name);
      default: return areas;
    }
  }

  const completed = areas.filter(a => a.is_complete).length;
  const total = areas.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.page}>
        <div style={webStyles.container}>

          {/* Header */}
          <div style={webStyles.header}>
            <button style={webStyles.backBtn} onClick={() => router.push('/home')}>
              ← Back
            </button>
            <div style={{ flex: 1 }}>
              <div style={webStyles.headerTitle}>{job?.name}</div>
              <div style={webStyles.headerSub}>
                <span style={{
                  ...webStyles.modeBadge,
                  background: job?.mode === 'electrician' ? '#FAECE7' : '#E1F5EE',
                  color: job?.mode === 'electrician' ? '#712B13' : '#085041',
                }}>
                  {job?.mode === 'electrician' ? 'Electrician' : 'Counting'}
                </span>
                <span style={webStyles.headerDate}>
                  {job?.date && new Date(job.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={webStyles.progressWrap}>
            <div style={webStyles.progressLabel}>
              <span>{completed} of {total} areas complete</span>
              <span style={{ color: Colors.blue, fontWeight: '500' }}>{Math.round(progress)}%</span>
            </div>
            <div style={webStyles.progressTrack}>
              <div style={{ ...webStyles.progressFill, width: `${progress}%` }} />
            </div>
          </div>

          {/* Filter pills */}
          <div style={webStyles.filterRow}>
            {['all', 'todo', 'complete', 'mine'].map(f => (
              <div
                key={f}
                style={{ ...webStyles.filterPill, ...(filter === f ? webStyles.filterPillActive : {}) }}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </div>
            ))}
          </div>

          {/* Area list */}
          <div style={webStyles.areaList}>
            {getFilteredAreas().map(area => (
              <div key={area.id} style={{
                ...webStyles.areaCard,
                borderLeft: `4px solid ${area.is_complete ? Colors.green : Colors.blue}`,
              }}>
                <div style={webStyles.areaCardContent}>
                  <div style={webStyles.areaTop}>
                    <div style={webStyles.areaName}>{area.name}</div>
                    <div style={webStyles.areaActions}>
                      {area.entered_by && (
                        <div style={{
                          ...webStyles.nameTag,
                          background: area.entered_by.color + '22',
                          color: area.entered_by.color,
                        }}>
                          {area.entered_by.initials}
                        </div>
                      )}
                      <button
                        style={{
                          ...webStyles.completeBtn,
                          background: area.is_complete ? Colors.green : '#fff',
                          color: area.is_complete ? '#fff' : Colors.textTertiary,
                          border: `1px solid ${area.is_complete ? Colors.green : '#e0e7ef'}`,
                        }}
                        onClick={() => toggleComplete(area)}
                      >
                        {area.is_complete ? '✓ Complete' : 'Mark done'}
                      </button>
                      <button
                        style={webStyles.editBtn}
                        onClick={() => router.push(`/area-entry?areaId=${area.id}&jobId=${jobId}`)}
                      >
                        Edit →
                      </button>
                    </div>
                  </div>
                  <div style={webStyles.areaMeta}>
                    <span style={webStyles.areaCount}>
                      {area.light_rows?.length || 0} light rows
                    </span>
                    {area.entered_by && (
                      <span style={webStyles.enteredBy}>Added by {area.entered_by.name}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {getFilteredAreas().length === 0 && (
              <div style={webStyles.emptyState}>
                {filter === 'all' ? 'No areas yet — add your first one below!' : `No ${filter} areas.`}
              </div>
            )}
          </div>

          {/* Add area */}
          {addingArea ? (
            <div style={webStyles.addAreaForm}>
              <input
                autoFocus
                style={webStyles.addAreaInput}
                placeholder="Area name (e.g. Gym, Hallway A)"
                value={newAreaName}
                onChange={e => setNewAreaName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addArea(); if (e.key === 'Escape') setAddingArea(false); }}
              />
              <button style={webStyles.addAreaConfirm} onClick={addArea}>Add</button>
              <button style={webStyles.addAreaCancel} onClick={() => { setAddingArea(false); setNewAreaName(''); }}>Cancel</button>
            </div>
          ) : (
            <button style={webStyles.addBtn} onClick={() => setAddingArea(true)}>
              + Add area
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── MOBILE VERSION ───────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/home')}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{job?.name}</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Mode badge */}
        <View style={styles.modeBadgeRow}>
          <View style={[styles.modeBadge, { backgroundColor: job?.mode === 'electrician' ? '#FAECE7' : '#E1F5EE' }]}>
            <Text style={[styles.modeBadgeText, { color: job?.mode === 'electrician' ? '#712B13' : '#085041' }]}>
              {job?.mode === 'electrician' ? 'Electrician' : 'Counting'}
            </Text>
          </View>
          <Text style={styles.jobDate}>
            {job?.date && new Date(job.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressLabel}>
          <Text style={styles.progressText}>{completed} of {total} areas complete</Text>
          <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['all', 'todo', 'complete', 'mine'].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Area cards */}
        {getFilteredAreas().map(area => (
          <TouchableOpacity
            key={area.id}
            style={[styles.areaCard, { borderLeftColor: area.is_complete ? Colors.green : Colors.blue }]}
            onPress={() => router.push(`/area-entry?areaId=${area.id}&jobId=${jobId}`)}
          >
            <View style={styles.areaTop}>
              <Text style={styles.areaName}>{area.name}</Text>
              <TouchableOpacity
                style={[styles.checkBtn, area.is_complete && styles.checkBtnDone]}
                onPress={() => toggleComplete(area)}
              >
                <Text style={{ color: area.is_complete ? '#fff' : Colors.textTertiary, fontSize: 12 }}>
                  {area.is_complete ? '✓' : '○'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.areaMeta}>
              <Text style={styles.areaCount}>{area.light_rows?.length || 0} light rows</Text>
              {area.entered_by && (
                <View style={[styles.nameTag, { backgroundColor: area.entered_by.color + '22' }]}>
                  <Text style={[styles.nameTagText, { color: area.entered_by.color }]}>
                    {area.entered_by.initials}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {getFilteredAreas().length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No areas yet — add your first one!' : `No ${filter} areas.`}
            </Text>
          </View>
        )}

        {/* Add area */}
        {addingArea ? (
          <View style={styles.addAreaForm}>
            <TextInput
              style={styles.addAreaInput}
              placeholder="Area name (e.g. Gym, Hallway A)"
              placeholderTextColor={Colors.textTertiary}
              value={newAreaName}
              onChangeText={setNewAreaName}
              autoFocus
            />
            <View style={styles.addAreaBtns}>
              <TouchableOpacity style={styles.addAreaConfirm} onPress={addArea}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addAreaCancel} onPress={() => { setAddingArea(false); setNewAreaName(''); }}>
                <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddingArea(true)}>
            <Text style={styles.addBtnText}>+ Add area</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const webStyles = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 800, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary, whiteSpace: 'nowrap' },
  headerTitle: { fontSize: 24, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  headerSub: { display: 'flex', alignItems: 'center', gap: 10 },
  modeBadge: { fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: '500' },
  headerDate: { fontSize: 12, color: Colors.textTertiary },
  progressWrap: { marginBottom: 20 },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  progressTrack: { height: 6, background: '#e0e7ef', borderRadius: 3 },
  progressFill: { height: 6, background: Colors.blue, borderRadius: 3, transition: 'width 0.3s' },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20 },
  filterPill: { padding: '5px 14px', borderRadius: 20, border: '0.5px solid #e0e7ef', background: '#fff', fontSize: 12, color: Colors.textSecondary, cursor: 'pointer' },
  filterPillActive: { background: '#E6F1FB', color: '#0C447C', borderColor: Colors.blue },
  areaList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
  areaCard: { background: '#fff', borderRadius: 12, border: '0.5px solid #e0e7ef', borderLeft: `4px solid ${Colors.blue}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  areaCardContent: { padding: '14px 18px' },
  areaTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  areaName: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  areaActions: { display: 'flex', alignItems: 'center', gap: 8 },
  nameTag: { width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: '600' },
  completeBtn: { padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: '500' },
  editBtn: { padding: '4px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: Colors.bgSecondary, border: '0.5px solid #e0e7ef', color: Colors.blue },
  areaMeta: { display: 'flex', gap: 12, alignItems: 'center' },
  areaCount: { fontSize: 12, color: Colors.textTertiary },
  enteredBy: { fontSize: 12, color: Colors.textTertiary },
  emptyState: { background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: Colors.textTertiary, border: '0.5px dashed #e0e7ef' },
  addAreaForm: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 },
  addAreaInput: { flex: 1, padding: '10px 14px', fontSize: 14, border: '0.5px solid #e0e7ef', borderRadius: 10, outline: 'none', fontFamily: 'inherit' },
  addAreaConfirm: { padding: '10px 20px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: '500' },
  addAreaCancel: { padding: '10px 16px', background: '#fff', color: Colors.textSecondary, border: '0.5px solid #e0e7ef', borderRadius: 10, fontSize: 14, cursor: 'pointer' },
  addBtn: { width: '100%', padding: '12px', background: 'transparent', border: '1px dashed #c0cfe0', borderRadius: 10, fontSize: 14, color: Colors.blue, cursor: 'pointer', textAlign: 'center' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { padding: 20, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { fontSize: 14, color: Colors.blue },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  modeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  modeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  modeBadgeText: { fontSize: 11, fontWeight: '500' },
  jobDate: { fontSize: 12, color: Colors.textTertiary },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 13, color: Colors.textSecondary },
  progressPct: { fontSize: 13, color: Colors.blue, fontWeight: '500' },
  progressTrack: { height: 5, backgroundColor: Colors.borderLight, borderRadius: 3, marginBottom: 16 },
  progressFill: { height: 5, backgroundColor: Colors.blue, borderRadius: 3 },
  filterRow: { marginBottom: 14 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.borderLight, backgroundColor: '#fff', marginRight: 8 },
  filterPillActive: { backgroundColor: '#E6F1FB', borderColor: Colors.blue },
  filterPillText: { fontSize: 12, color: Colors.textSecondary },
  filterPillTextActive: { color: '#0C447C' },
  areaCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: Colors.borderLight, borderLeftWidth: 4, padding: 14, marginBottom: 10 },
  areaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  areaName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, flex: 1 },
  checkBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  checkBtnDone: { backgroundColor: Colors.green, borderColor: Colors.green },
  areaMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  areaCount: { fontSize: 12, color: Colors.textTertiary },
  nameTag: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  nameTagText: { fontSize: 11, fontWeight: '600' },
  emptyState: { backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.borderLight, borderStyle: 'dashed', marginBottom: 16 },
  emptyText: { color: Colors.textTertiary, fontSize: 14 },
  addAreaForm: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: Colors.borderLight, marginBottom: 10 },
  addAreaInput: { borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 8, padding: 10, fontSize: 14, color: Colors.textPrimary, marginBottom: 10 },
  addAreaBtns: { flexDirection: 'row', gap: 10 },
  addAreaConfirm: { flex: 1, backgroundColor: Colors.blue, borderRadius: 8, padding: 10, alignItems: 'center' },
  addAreaCancel: { flex: 1, backgroundColor: Colors.bgSecondary, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.borderLight },
  addBtn: { borderWidth: 1, borderColor: '#c0cfe0', borderStyle: 'dashed', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 },
  addBtnText: { fontSize: 14, color: Colors.blue },
});