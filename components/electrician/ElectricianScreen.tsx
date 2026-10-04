import { router } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import AreaPhotos from '../area-photos/AreaPhotos';
import { CONTROL_LABEL } from '../area-entry/useAreaEntry';
import { getStatusLabel, useElectrician } from './useElectrician';

// Native UI. The web UI lives in ElectricianScreen.web.tsx; Metro picks the right file per platform.

async function checkConnectivity() {
  const response = await fetch('https://www.google.com', { method: 'HEAD' });
  return response.ok;
}

const CONTROL_STATUSES = ['pending', 'in_progress', 'complete'];
const statusColors = (s: string) => ({
  bg: s === 'complete' ? '#E1F5EE' : s === 'in_progress' ? '#E6F1FB' : '#F0F0EE',
  fg: s === 'complete' ? '#085041' : s === 'in_progress' ? '#0C447C' : '#555',
  border: s === 'complete' ? Colors.green : s === 'in_progress' ? Colors.blue : '#999',
});

// One sensor/photocell line with its own install status pills.
function ControlStatusLine({ control, status, onStatus }: { control: any; status: string; onStatus: (s: string) => void }) {
  return (
    <View style={styles.controlBlock}>
      <Text style={styles.controlText}>
        {CONTROL_LABEL[control.kind as keyof typeof CONTROL_LABEL]}: {control.quantity} × {control.control_type || '?'}
      </Text>
      <View style={styles.controlPills}>
        {CONTROL_STATUSES.map(s => {
          const c = statusColors(s);
          const active = status === s;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.statusPill, active && { backgroundColor: c.bg, borderColor: c.border }]}
              onPress={() => onStatus(s)}
            >
              <Text style={[styles.statusPillText, active && { color: c.fg, fontWeight: '600' }]}>{getStatusLabel(s)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function ElectricianScreen() {
  const {
    areaId, jobId, area, job, lightRows, notes, setNotes, needsFollowUp, setNeedsFollowUp,
    loading, saving, isOnlineStatus, getInstallRow, updateInstallRow, save,
    getRowControls, areaLevelControls, getControlStatus, updateControlStatus,
  } = useElectrician(checkConnectivity);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.coral} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(`/area-list?jobId=${jobId}`)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{area?.name}</Text>
          <View style={[styles.onlineBadge, { backgroundColor: isOnlineStatus ? '#E1F5EE' : '#FAECE7' }]}>
            <Text style={[styles.onlineBadgeText, { color: isOnlineStatus ? '#085041' : '#712B13' }]}>
              {isOnlineStatus ? '● Online' : '● Offline'}
            </Text>
          </View>
        </View>

        {/* Mode badge */}
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>Electrician mode</Text>
        </View>

        {/* Reference panel */}
        <View style={styles.refPanel}>
          <Text style={styles.refLabel}>New lights ordered:</Text>
          <Text style={styles.refVal}>
            {lightRows.map(r => `${r.quantity} × ${r.light_type_id || 'Unknown'}`).join('\n') || 'No lights entered yet'}
          </Text>
        </View>

        <AreaPhotos areaId={areaId} jobId={jobId} />

        <Text style={styles.sectionLabel}>Install progress</Text>

        {lightRows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No new lights entered yet. Add them in counting mode first.</Text>
          </View>
        ) : (
          lightRows.map(row => {
            const install = getInstallRow(row.id);
            return (
              <View key={row.id} style={styles.installBlock}>
                <Text style={styles.installType}>
                  {row.new_addition
                    ? `➕ ${row.new_quantity} × ${row.new_light_type || '?'}`
                    : row.removed_only
                    ? `🗑 Remove: ${row.quantity} × ${row.light_type_id || '?'}`
                    : `${row.quantity} × ${row.light_type_id || '?'} → ${row.new_quantity} × ${row.new_light_type || '?'}`
                  }
                </Text>
                <Text style={styles.installQty}>
                  {row.removed_only ? 'Remove only' : `${row.new_quantity || row.quantity} units`}
                </Text>

                {/* Status pills */}
                <View style={styles.statusPills}>
                  {['pending', 'in_progress', 'complete'].map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusPill,
                        install.status === s && {
                          backgroundColor: s === 'complete' ? '#E1F5EE' : s === 'in_progress' ? '#E6F1FB' : '#F0F0EE',
                          borderColor: s === 'complete' ? Colors.green : s === 'in_progress' ? Colors.blue : '#999',
                        }
                      ]}
                      onPress={() => updateInstallRow(row.id, 'status', s)}
                    >
                      <Text style={[
                        styles.statusPillText,
                        install.status === s && {
                          color: s === 'complete' ? '#085041' : s === 'in_progress' ? '#0C447C' : '#555',
                          fontWeight: '600',
                        }
                      ]}>
                        {getStatusLabel(s)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Removed flag */}
                <TouchableOpacity
                  style={[styles.removedRow, install.removed && styles.removedRowOn]}
                  onPress={() => updateInstallRow(row.id, 'removed', !install.removed)}
                >
                  <Text style={styles.removedLabel}>Removed, not replaced</Text>
                  <View style={[styles.toggle, { backgroundColor: install.removed ? Colors.coral : '#ccc' }]}>
                    <View style={[styles.toggleThumb, install.removed && { transform: [{ translateX: 16 }] }]} />
                  </View>
                </TouchableOpacity>

                {install.removed && (
                  <TextInput
                    style={styles.removalInput}
                    multiline
                    placeholder="Why was this removed without replacement?"
                    placeholderTextColor={Colors.textTertiary}
                    value={install.removal_note || ''}
                    onChangeText={v => updateInstallRow(row.id, 'removal_note', v)}
                  />
                )}

                {getRowControls(row.id).map(c => (
                  <ControlStatusLine key={c.id} control={c} status={getControlStatus(c)} onStatus={s => updateControlStatus(c.id, s)} />
                ))}
              </View>
            );
          })
        )}

        {areaLevelControls.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Area sensors & photocells</Text>
            <View style={styles.installBlock}>
              {areaLevelControls.map(c => (
                <ControlStatusLine key={c.id} control={c} status={getControlStatus(c)} onStatus={s => updateControlStatus(c.id, s)} />
              ))}
            </View>
          </>
        )}

        <View style={styles.divider} />

        {/* Follow-up flag */}
        <TouchableOpacity
          style={[styles.followUpRow, needsFollowUp && styles.followUpRowOn]}
          onPress={() => setNeedsFollowUp(!needsFollowUp)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.followUpLabel}>Flag for follow-up</Text>
            <Text style={styles.followUpSub}>Notify owner this area needs another visit</Text>
          </View>
          <View style={[styles.toggle, { backgroundColor: needsFollowUp ? Colors.coral : '#ccc' }]}>
            <View style={[styles.toggleThumb, needsFollowUp && { transform: [{ translateX: 16 }] }]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.layoutBtn, { borderColor: '#D08A6E' }]}
          onPress={() => router.push(`/job-issues?jobId=${jobId}&areaId=${areaId}` as any)}
        >
          <Text style={[styles.layoutBtnText, { color: '#712B13' }]}>⚠️ Log an issue (bad light, change…)</Text>
        </TouchableOpacity>

        {job?.col_layout && (
          <TouchableOpacity
            style={styles.layoutBtn}
            onPress={() => router.push(`/layout-canvas?areaId=${areaId}&jobId=${jobId}&areaName=${area?.name}`)}
          >
            <Text style={styles.layoutBtnText}>🗺 View ceiling layout</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Install notes</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          numberOfLines={3}
          placeholder="Add install notes for this area..."
          placeholderTextColor={Colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>{isOnlineStatus ? 'Save progress' : 'Save offline'}</Text>
          }
        </TouchableOpacity>

        {!isOnlineStatus && (
          <Text style={styles.offlineNote}>
            ⚠️ Offline — changes will sync when connection is restored
          </Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  controlBlock: { padding: 12, borderTopWidth: 0.5, borderTopColor: Colors.borderLight, gap: 8 },
  controlText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  controlPills: { flexDirection: 'row', gap: 8 },
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { padding: 20, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { fontSize: 14, color: Colors.blue },
  headerTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  onlineBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  onlineBadgeText: { fontSize: 11, fontWeight: '500' },
  modeBadge: { alignSelf: 'flex-start', backgroundColor: '#FAECE7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 3, marginBottom: 14 },
  modeBadgeText: { fontSize: 11, color: '#712B13', fontWeight: '500' },
  refPanel: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: Colors.borderLight, marginBottom: 16 },
  refLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  refVal: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500', lineHeight: 20 },
  sectionLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  emptyState: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.borderLight, borderStyle: 'dashed', marginBottom: 16 },
  emptyText: { color: Colors.textTertiary, fontSize: 13, textAlign: 'center' },
  installBlock: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: Colors.borderLight, marginBottom: 12, overflow: 'hidden' },
  installType: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, padding: 14, paddingBottom: 4 },
  installQty: { fontSize: 12, color: Colors.textTertiary, paddingHorizontal: 14, paddingBottom: 10 },
  statusPills: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 0.5, borderTopColor: Colors.borderLight },
  statusPill: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: Colors.borderLight, backgroundColor: '#fff' },
  statusPillText: { fontSize: 11, color: Colors.textSecondary },
  removedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 0.5, borderTopColor: Colors.borderLight },
  removedRowOn: { backgroundColor: '#FAECE7' },
  removedLabel: { fontSize: 13, color: Colors.textSecondary },
  toggle: { width: 36, height: 20, borderRadius: 10, justifyContent: 'center' },
  toggleThumb: { position: 'absolute', left: 3, width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff' },
  removalInput: { backgroundColor: '#FAECE7', borderWidth: 0.5, borderColor: '#D08A6E', borderRadius: 0, padding: 12, fontSize: 13, color: '#4A1F11', minHeight: 60 },
  divider: { height: 0.5, backgroundColor: Colors.borderLight, marginVertical: 16 },
  followUpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.borderLight, backgroundColor: '#fff', marginBottom: 10 },
  followUpRowOn: { backgroundColor: '#FAECE7', borderColor: Colors.coral },
  followUpLabel: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  followUpSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  layoutBtn: { borderWidth: 1, borderColor: '#AFA9EC', borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 10 },
  layoutBtnText: { fontSize: 13, color: '#534AB7' },
  notesInput: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 10, padding: 12, fontSize: 13, color: Colors.textPrimary, minHeight: 80, marginTop: 8 },
  saveBtn: { backgroundColor: Colors.coral, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  offlineNote: { marginTop: 10, fontSize: 12, color: '#854F0B', textAlign: 'center', padding: 8, backgroundColor: '#FAEEDA', borderRadius: 8 },
});
