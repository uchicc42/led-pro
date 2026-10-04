import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAreaList } from './useAreaList';

// Native UI. The web UI lives in AreaListScreen.web.tsx; Metro picks the right file per platform.

export default function AreaListScreen() {
  const {
    jobId, job, loading, addingArea, setAddingArea, newAreaName, setNewAreaName,
    filter, setFilter, jobNotes, notesSaved, saveJobNotes, addArea, toggleComplete, deleteArea,
    getFilteredAreas, completed, total, progress, openIssues,
  } = useAreaList({ live: 'realtime' });
  // The role check reads the web session store, which doesn't exist on native, so this was always false here.
  const isElectrician = false;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/home')}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{job?.name}</Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push(`/job-settings?jobId=${jobId}` as any)}
            accessibilityLabel="Job settings"
          >
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

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

        <View style={styles.progressLabel}>
          <Text style={styles.progressText}>{completed} of {total} areas complete</Text>
          <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

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

        {getFilteredAreas().map(area => (
          <View
            key={area.id}
            style={[styles.areaCard, { borderLeftColor: area.is_complete ? Colors.green : Colors.blue }]}
          >
            <TouchableOpacity
              style={styles.areaCardMain}
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

            <View style={styles.areaActions}>
              <TouchableOpacity
                style={styles.areaActionBtn}
                onPress={() => router.push(`/area-entry?areaId=${area.id}&jobId=${jobId}`)}
              >
                <Text style={styles.areaActionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.areaActionBtn, styles.areaActionBtnElec]}
                onPress={() => router.push(`/electrician?areaId=${area.id}&jobId=${jobId}`)}
              >
                <Text style={[styles.areaActionBtnText, { color: '#712B13' }]}>⚡ Elec</Text>
              </TouchableOpacity>
              {!isElectrician && (
                <TouchableOpacity
                  style={[styles.areaActionBtn, { borderRightWidth: 0 }]}
                  onPress={() => {
                    Alert.alert(
                      area.name,
                      'What would you like to do?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: '🗑 Delete area',
                          style: 'destructive',
                          onPress: () => Alert.alert(
                            'Delete area',
                            `Delete "${area.name}"? This will also remove all light rows.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => deleteArea(area) },
                            ]
                          )
                        },
                      ]
                    );
                  }}
                >
                  <Text style={[styles.areaActionBtnText, { color: Colors.textSecondary, fontSize: 16 }]}>···</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {getFilteredAreas().length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No areas yet — add your first one!' : `No ${filter} areas.`}
            </Text>
          </View>
        )}

        {/* Job notes */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1 }}>Job notes</Text>
            {notesSaved && <Text style={{ fontSize: 11, color: Colors.green }}>✓ Saved</Text>}
          </View>
          <TextInput
            style={{ backgroundColor: '#fff', borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 10, padding: 12, fontSize: 13, color: Colors.textPrimary, minHeight: 80 }}
            multiline
            placeholder="Add job-wide notes here..."
            placeholderTextColor={Colors.textTertiary}
            value={jobNotes}
            onChangeText={saveJobNotes}
          />
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: openIssues > 0 ? '#FAECE7' : '#fff', borderStyle: 'solid', borderColor: openIssues > 0 ? '#D08A6E' : '#c0cfe0', marginBottom: 8 }]}
          onPress={() => router.push(`/job-issues?jobId=${jobId}` as any)}
        >
          <Text style={[styles.addBtnText, { color: openIssues > 0 ? '#712B13' : Colors.textSecondary }]}>
            ⚠️ Issue log{openIssues > 0 ? ` · ${openIssues} open` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#fff', borderStyle: 'solid', marginBottom: 8 }]}
          onPress={() => router.push(`/change-log?jobId=${jobId}`)}
        >
          <Text style={[styles.addBtnText, { color: Colors.textSecondary }]}>🕐 Change log</Text>
        </TouchableOpacity>

        {!isElectrician && (addingArea ? (
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
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  settingsBtn: { width: 50, alignItems: 'flex-end', paddingVertical: 4 },
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
  areaCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: Colors.borderLight, borderLeftWidth: 4, marginBottom: 10, overflow: 'hidden' },
  areaCardMain: { padding: 14 },
  areaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  areaName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, flex: 1 },
  checkBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  checkBtnDone: { backgroundColor: Colors.green, borderColor: Colors.green },
  areaMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  areaCount: { fontSize: 12, color: Colors.textTertiary },
  nameTag: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  nameTagText: { fontSize: 11, fontWeight: '600' },
  areaActions: { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: Colors.borderLight },
  areaActionBtn: { flex: 1, padding: 10, alignItems: 'center', borderRightWidth: 0.5, borderRightColor: Colors.borderLight },
  areaActionBtnElec: { backgroundColor: '#FAECE7' },
  areaActionBtnText: { fontSize: 12, color: Colors.blue, fontWeight: '500' },
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
