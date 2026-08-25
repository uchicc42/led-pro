import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Platform,
  SafeAreaView, ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { saveInstallData, saveInstallRow, syncQueue } from '../../constants/offlineSync';
import { supabase } from '../../supabase';

export default function ElectricianScreen() {
  const { areaId, jobId } = useLocalSearchParams();
  const [area, setArea] = useState(null);
  const [job, setJob] = useState(null);
  const [lightRows, setLightRows] = useState([]);
  const [installRows, setInstallRows] = useState({});
  const [notes, setNotes] = useState('');
  const [needsFollowUp, setNeedsFollowUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isOnlineStatus, setIsOnlineStatus] = useState(true);

  useEffect(() => {
    loadAll();
    checkOnline();
    const interval = setInterval(checkOnline, 10000);
    return () => clearInterval(interval);
  }, [areaId]);

  async function checkOnline() {
    try {
      if (Platform.OS === 'web') {
        setIsOnlineStatus(navigator.onLine);
      } else {
        const response = await fetch('https://www.google.com', { method: 'HEAD' });
        setIsOnlineStatus(response.ok);
      }
      if (isOnlineStatus) await syncQueue();
    } catch {
      setIsOnlineStatus(false);
    }
  }

  async function loadAll() {
    await Promise.all([loadArea(), loadJob(), loadLightRows()]);
    setLoading(false);
  }

  async function loadArea() {
    const { data } = await supabase.from('areas').select('*').eq('id', areaId).single();
    if (data) {
      setArea(data);
      setNotes(data.install_notes || '');
      setNeedsFollowUp(data.needs_follow_up || false);
    }
  }

  async function loadJob() {
    const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single();
    if (data) setJob(data);
  }

  async function loadLightRows() {
    const { data: rows } = await supabase
      .from('light_rows')
      .select('*')
      .eq('area_id', areaId)
      .eq('section', 'new')
      .order('sort_order');
    if (rows) setLightRows(rows);

    const { data: installs } = await supabase
      .from('install_rows')
      .select('*')
      .in('light_row_id', (rows || []).map(r => r.id));

    if (installs) {
      const map = {};
      installs.forEach(i => { map[i.light_row_id] = i; });
      setInstallRows(map);
    }
  }

  function getInstallRow(lightRowId) {
    return installRows[lightRowId] || {
      status: 'pending',
      removed: false,
      removal_note: '',
    };
  }

  function updateInstallRow(lightRowId, field, value) {
    setInstallRows(prev => ({
      ...prev,
      [lightRowId]: {
        ...getInstallRow(lightRowId),
        [field]: value,
        light_row_id: lightRowId,
      }
    }));
  }

  async function save() {
    setSaving(true);

    await saveInstallData(areaId, {
      install_notes: notes,
      needs_follow_up: needsFollowUp,
    });

    for (const lightRowId of Object.keys(installRows)) {
      const row = installRows[lightRowId];
      await saveInstallRow({
        light_row_id: lightRowId,
        status: row.status || 'pending',
        removed: row.removed || false,
        removal_note: row.removal_note || '',
      });
    }

    setSaving(false);
  }

  function getStatusColor(status) {
    if (status === 'complete') return Colors.green;
    if (status === 'in_progress') return Colors.blue;
    return Colors.textTertiary;
  }

  function getStatusLabel(status) {
    if (status === 'complete') return 'Complete';
    if (status === 'in_progress') return 'In progress';
    return 'Pending';
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.coral} />
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.page}>
        <div style={webStyles.container}>

          {/* Header */}
          <div style={webStyles.header}>
            <button style={webStyles.backBtn} onClick={() => router.push(`/area-list?jobId=${jobId}`)}>
              ← Back
            </button>
            <div>
              <div style={webStyles.headerTitle}>{area?.name}</div>
              <div style={webStyles.headerSub}>{job?.name}</div>
            </div>
            <div style={{
              ...webStyles.onlineBadge,
              background: isOnlineStatus ? '#E1F5EE' : '#FAECE7',
              color: isOnlineStatus ? '#085041' : '#712B13',
            }}>
              {isOnlineStatus ? '● Online' : '● Offline'}
            </div>
          </div>

          <div style={webStyles.modeBadge}>Electrician mode</div>

          {/* Reference panel */}
          <div style={webStyles.refPanel}>
            <div style={webStyles.refLabel}>Reference — from counting</div>
            <div style={webStyles.refRow}>
              <span style={webStyles.refKey}>New lights ordered:</span>
              <span style={webStyles.refVal}>
                {lightRows.map(r => `${r.quantity} × ${r.light_type_id || 'Unknown'}`).join(', ') || 'No lights entered yet'}
              </span>
            </div>
          </div>

          <div style={webStyles.card}>

            {/* Install progress */}
            <div style={webStyles.sectionLabel}>Install progress</div>

            {lightRows.length === 0 ? (
              <div style={webStyles.emptyState}>
                No new lights entered for this area yet. Go to counting mode to add them first.
              </div>
            ) : (
              lightRows.map(row => {
                const install = getInstallRow(row.id);
                return (
                  <div key={row.id} style={webStyles.installBlock}>
                    <div style={webStyles.installTop}>
                      <div>
                        <div style={webStyles.installType}>{row.light_type_id || 'Unknown type'}</div>
                        <div style={webStyles.installQty}>{row.quantity} units to install</div>
                      </div>
                    </div>

                    {/* Status pills */}
                    <div style={webStyles.statusPills}>
                      {['pending', 'in_progress', 'complete'].map(s => (
                        <div
                          key={s}
                          style={{
                            ...webStyles.statusPill,
                            ...(install.status === s ? {
                              background: s === 'complete' ? '#E1F5EE' : s === 'in_progress' ? '#E6F1FB' : '#F0F0EE',
                              color: s === 'complete' ? '#085041' : s === 'in_progress' ? '#0C447C' : '#555',
                              borderColor: s === 'complete' ? Colors.green : s === 'in_progress' ? Colors.blue : '#999',
                              fontWeight: '600',
                            } : {})
                          }}
                          onClick={() => updateInstallRow(row.id, 'status', s)}
                        >
                          {getStatusLabel(s)}
                        </div>
                      ))}
                    </div>

                    {/* Removed flag */}
                    <div
                      style={{
                        ...webStyles.removedRow,
                        background: install.removed ? '#FAECE7' : '#fff',
                        borderTop: '0.5px solid #f0f0f0',
                      }}
                    >
                      <span style={webStyles.removedLabel}>Light removed, not replaced here</span>
                      <div
                        style={{
                          ...webStyles.toggle,
                          background: install.removed ? Colors.coral : '#ccc',
                        }}
                        onClick={() => updateInstallRow(row.id, 'removed', !install.removed)}
                      >
                        <div style={{
                          ...webStyles.toggleThumb,
                          transform: install.removed ? 'translateX(16px)' : 'translateX(0)',
                        }} />
                      </div>
                    </div>

                    {install.removed && (
                      <div style={webStyles.removalExpand}>
                        <div style={webStyles.removalLabel}>Reason / note</div>
                        <textarea
                          style={webStyles.removalInput}
                          rows={2}
                          placeholder="Why was this light removed without replacement?"
                          value={install.removal_note || ''}
                          onChange={e => updateInstallRow(row.id, 'removal_note', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <div style={webStyles.divider} />

            {/* Follow-up flag */}
            <div
              style={{
                ...webStyles.followUpRow,
                background: needsFollowUp ? '#FAECE7' : '#fff',
                border: `1px solid ${needsFollowUp ? Colors.coral : '#e0e7ef'}`,
              }}
              onClick={() => setNeedsFollowUp(!needsFollowUp)}
            >
              <div>
                <div style={webStyles.followUpLabel}>Flag for follow-up</div>
                <div style={webStyles.followUpSub}>Notify owner this area needs another visit</div>
              </div>
              <div style={{
                ...webStyles.toggle,
                background: needsFollowUp ? Colors.coral : '#ccc',
              }}>
                <div style={{
                  ...webStyles.toggleThumb,
                  transform: needsFollowUp ? 'translateX(16px)' : 'translateX(0)',
                }} />
              </div>
            </div>

            {/* Layout link */}
            {job?.col_layout && (
              <>
                <div style={webStyles.divider} />
                <button
                  style={webStyles.layoutBtn}
                  onClick={() => router.push(`/layout-canvas?areaId=${areaId}&jobId=${jobId}&areaName=${area?.name}`)}
                >
                  🗺 View ceiling layout
                </button>
              </>
            )}

            <div style={webStyles.divider} />

            {/* Notes */}
            <div style={webStyles.sectionLabel}>Install notes</div>
            <textarea
              style={webStyles.notesInput}
              rows={3}
              placeholder="Add install notes for this area..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            {/* Save */}
            <button
              style={{ ...webStyles.saveBtn, opacity: saving ? 0.6 : 1 }}
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving...' : isOnlineStatus ? 'Save progress' : 'Save offline'}
            </button>

            {!isOnlineStatus && (
              <div style={webStyles.offlineNote}>
                ⚠️ You're offline — changes will sync automatically when connection is restored
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MOBILE VERSION ───────────────────────────────────────
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
                <Text style={styles.installType}>{row.light_type_id || 'Unknown type'}</Text>
                <Text style={styles.installQty}>{row.quantity} units to install</Text>

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
              </View>
            );
          })
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

const webStyles = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 700, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary, whiteSpace: 'nowrap' },
  headerTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  headerSub: { fontSize: 13, color: Colors.textTertiary },
  onlineBadge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: '500' },
  modeBadge: { display: 'inline-block', fontSize: 11, padding: '3px 12px', borderRadius: 20, background: '#FAECE7', color: '#712B13', fontWeight: '500', marginBottom: 16 },
  refPanel: { background: '#fff', borderRadius: 12, padding: '14px 18px', border: '0.5px solid #e0e7ef', marginBottom: 16 },
  refLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 },
  refRow: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  refKey: { fontSize: 13, color: Colors.textSecondary, whiteSpace: 'nowrap' },
  refVal: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  card: { background: '#fff', borderRadius: 16, padding: '24px 28px', border: '0.5px solid #e0e7ef', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  sectionLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 },
  emptyState: { padding: 24, textAlign: 'center', color: Colors.textTertiary, fontSize: 13, border: '0.5px dashed #e0e7ef', borderRadius: 10, marginBottom: 16 },
  installBlock: { border: '0.5px solid #e0e7ef', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  installTop: { padding: '12px 16px', borderBottom: '0.5px solid #f5f5f5' },
  installType: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  installQty: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  statusPills: { display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '0.5px solid #f5f5f5' },
  statusPill: { flex: 1, textAlign: 'center', padding: '7px 0', fontSize: 12, borderRadius: 8, border: '0.5px solid #e0e7ef', cursor: 'pointer', color: Colors.textSecondary },
  removedRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', cursor: 'pointer' },
  removedLabel: { fontSize: 13, color: Colors.textSecondary },
  toggle: { width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 },
  toggleThumb: { position: 'absolute', top: 3, left: 3, width: 14, height: 14, borderRadius: 7, background: '#fff', transition: 'transform 0.2s' },
  removalExpand: { background: '#FAECE7', padding: '10px 16px', borderTop: '0.5px solid #D08A6E' },
  removalLabel: { fontSize: 10, color: '#712B13', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  removalInput: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13, border: '0.5px solid #D08A6E', borderRadius: 8, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#4A1F11', resize: 'none' },
  divider: { borderTop: '0.5px solid #f0f0f0', margin: '20px 0' },
  followUpRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 12, cursor: 'pointer', marginBottom: 8 },
  followUpLabel: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  followUpSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  layoutBtn: { width: '100%', padding: '11px', background: 'transparent', border: '0.5px dashed #AFA9EC', borderRadius: 10, fontSize: 13, color: '#534AB7', cursor: 'pointer', marginBottom: 4 },
  notesInput: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 13, border: '0.5px solid #e0e7ef', borderRadius: 8, outline: 'none', fontFamily: 'inherit', resize: 'vertical', marginTop: 8 },
  saveBtn: { width: '100%', padding: '13px', background: Colors.coral, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: '500', cursor: 'pointer', marginTop: 20 },
  offlineNote: { marginTop: 10, fontSize: 12, color: '#854F0B', textAlign: 'center', padding: '8px', background: '#FAEEDA', borderRadius: 8 },
};

const styles = StyleSheet.create({
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