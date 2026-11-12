import { router } from 'expo-router';
import { useState } from 'react';
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
import { NotOnDevice } from '../ui/not-on-device';
import { KeyboardScrollView } from '../ui/keyboard-scroll-view';
import AreaFormModal from './AreaFormModal';
import ReorderList from './ReorderList';
import { useAreaList } from './useAreaList';

// Native UI. The web UI lives in AreaListScreen.web.tsx; Metro picks the right file per platform.

export default function AreaListScreen() {
  const {
    jobId, job, loading, notOnDevice, filter, setFilter, jobNotes, notesSaved, saveJobNotes, toggleComplete, deleteArea,
    getFilteredGroups, groups, expanded, toggleExpanded, completed, total, progress, openIssues, reordering, setReordering, moveArea,
    areaForm, parentOptions, openAddArea, openDuplicate, setFormName, setFormParent, closeAreaForm, submitAreaForm,
  } = useAreaList({ live: 'realtime' });
  // The role check reads the web session store, which doesn't exist on native, so this was always false here.
  const isElectrician = false;
  const [dragging, setDragging] = useState(false);
  const filteredGroups = getFilteredGroups();

  function areaMenu(area: any, roomCount: number, isRoom: boolean) {
    const confirmDelete = () => Alert.alert(
      'Delete area',
      roomCount > 0
        ? `Delete "${area.name}" and the ${roomCount} room${roomCount === 1 ? '' : 's'} inside it? This also removes all their light rows.`
        : `Delete "${area.name}"? This will also remove all light rows.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteArea(area) },
      ]
    );
    Alert.alert(area.name, 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      ...(!isRoom ? [{ text: '＋ Add room inside', onPress: () => openAddArea(area.id) }] : []),
      { text: '🗑 Delete area', style: 'destructive' as const, onPress: confirmDelete },
    ]);
  }

  // One area or room on the list.
  function areaCard(area: any, opts: { isRoom: boolean; rooms?: any[]; roomsShown?: boolean }) {
    const rooms = opts.rooms ?? [];
    const roomsDone = rooms.filter(r => r.is_complete).length;
    return (
      <View
        key={area.id}
        style={[styles.areaCard, opts.isRoom && styles.roomCard, { borderLeftColor: area.is_complete ? Colors.green : Colors.blue }]}
      >
        <TouchableOpacity
          style={styles.areaCardMain}
          onPress={() => router.push(`/area-entry?areaId=${area.id}&jobId=${jobId}`)}
        >
          <View style={styles.areaTop}>
            <Text style={styles.areaName}>{opts.isRoom ? '› ' : ''}{area.name}</Text>
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
            {rooms.length > 0 && (
              <TouchableOpacity style={styles.roomsToggle} onPress={() => toggleExpanded(area.id)}>
                <Text style={styles.roomsToggleText}>
                  {opts.roomsShown ? '▾' : '▸'} {rooms.length} room{rooms.length === 1 ? '' : 's'} · {roomsDone} done
                </Text>
              </TouchableOpacity>
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
            <TouchableOpacity style={styles.areaActionBtn} onPress={() => openDuplicate(area)} accessibilityLabel={`Duplicate ${area.name}`}>
              <Text style={styles.areaActionBtnText}>⧉ Duplicate</Text>
            </TouchableOpacity>
          )}
          {!isElectrician && (
            <TouchableOpacity
              style={[styles.areaActionBtn, { borderRightWidth: 0 }]}
              onPress={() => areaMenu(area, rooms.length, opts.isRoom)}
            >
              <Text style={[styles.areaActionBtnText, { color: Colors.textSecondary, fontSize: 16 }]}>···</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (notOnDevice) return <NotOnDevice />;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardScrollView contentContainerStyle={styles.scroll} scrollEnabled={!dragging}>

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

        <View style={styles.listBar}>
          {reordering ? (
            <Text style={styles.reorderHint}>Drag ☰ or tap ▲ ▼ to move areas</Text>
          ) : (
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
          )}
          {total > 1 && (
            <TouchableOpacity
              style={[styles.reorderBtn, reordering && styles.reorderBtnDone]}
              onPress={() => setReordering(!reordering)}
            >
              <Text style={[styles.reorderBtnText, reordering && { color: '#fff' }]}>
                {reordering ? 'Done' : '↕ Reorder'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {reordering && (
          <>
            <ReorderList areas={groups.map(g => g.area)} onMove={(from, to) => moveArea(null, from, to)} onDraggingChange={setDragging} />
            {/* Rooms are ordered within their area. */}
            {groups.filter(g => g.rooms.length > 1).map(g => (
              <View key={g.area.id}>
                <Text style={styles.reorderGroupLabel}>Rooms in {g.area.name}</Text>
                <ReorderList areas={g.rooms} onMove={(from, to) => moveArea(g.area.id, from, to)} onDraggingChange={setDragging} />
              </View>
            ))}
          </>
        )}

        {!reordering && filteredGroups.map(g => {
          // While filtering, matching rooms show without opening their area.
          const roomsShown = g.rooms.length > 0 && (expanded.has(g.area.id) || filter !== 'all');
          const allRooms = groups.find(x => x.area.id === g.area.id)?.rooms ?? g.rooms;
          return (
            <View key={g.area.id}>
              {areaCard(g.area, { isRoom: false, rooms: allRooms, roomsShown })}
              {roomsShown && g.rooms.map(r => areaCard(r, { isRoom: true }))}
              {roomsShown && !isElectrician && (
                <TouchableOpacity style={styles.addRoomBtn} onPress={() => openAddArea(g.area.id)}>
                  <Text style={styles.addRoomText}>+ Add room to {g.area.name}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {!reordering && filteredGroups.length === 0 && (
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

        {!isElectrician && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: Colors.blue, borderStyle: 'solid', borderColor: Colors.blue, marginBottom: 8 }]}
            onPress={() => router.push(`/scope-export?jobId=${jobId}` as any)}
          >
            <Text style={[styles.addBtnText, { color: '#fff', fontWeight: '500' }]}>📄 Export scope of work</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#fff', borderStyle: 'solid', borderColor: Colors.blue, marginBottom: 8 }]}
          onPress={() => router.push(`/job-summary?jobId=${jobId}` as any)}
        >
          <Text style={[styles.addBtnText, { color: Colors.blue, fontWeight: '500' }]}>📋 Job summary</Text>
        </TouchableOpacity>

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

        {!isElectrician && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openAddArea()}>
            <Text style={styles.addBtnText}>+ Add area</Text>
          </TouchableOpacity>
        )}

      </KeyboardScrollView>

      {/* Floating add button: stays in the corner while the list scrolls. */}
      {!isElectrician && !reordering && (
        <TouchableOpacity style={styles.fab} onPress={() => openAddArea()} accessibilityLabel="Add area">
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <AreaFormModal
        form={areaForm}
        parentOptions={parentOptions}
        setName={setFormName}
        setParent={setFormParent}
        onSubmit={submitAreaForm}
        onClose={closeAreaForm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  settingsBtn: { width: 50, alignItems: 'flex-end', paddingVertical: 4 },
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { padding: 20, paddingBottom: 110 }, // room for the floating add button
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
  listBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  filterRow: { flex: 1 },
  reorderHint: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  reorderBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.blue, backgroundColor: '#fff' },
  reorderBtnDone: { backgroundColor: Colors.blue },
  reorderBtnText: { fontSize: 12, color: Colors.blue, fontWeight: '500' },
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
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 32, fontWeight: '300' },
  roomCard: { marginLeft: 22 },
  roomsToggle: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#E6F1FB' },
  roomsToggleText: { fontSize: 12, color: '#0C447C', fontWeight: '500' },
  addRoomBtn: { marginLeft: 22, borderWidth: 1, borderColor: '#c0cfe0', borderStyle: 'dashed', borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 10 },
  addRoomText: { fontSize: 13, color: Colors.blue },
  reorderGroupLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  addBtn: { borderWidth: 1, borderColor: '#c0cfe0', borderStyle: 'dashed', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 },
  addBtnText: { fontSize: 14, color: Colors.blue },
});
