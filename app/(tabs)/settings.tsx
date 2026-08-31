import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView, ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { registerForPushNotifications } from '../../constants/notifications';
import { getCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';

export default function SettingsScreen() {
  const [lightTypes, setLightTypes] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCategory, setNewTypeCategory] = useState('current');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandLights, setExpandLights] = useState(false);
  const [expandTeam, setExpandTeam] = useState(false);
  const [currentUser, setCurrentUser_state] = useState(null);
  const [notifyAreaComplete, setNotifyAreaComplete] = useState(true);
  const [notifyJobComplete, setNotifyJobComplete] = useState(true);
  const [notifyJobNotes, setNotifyJobNotes] = useState(true);
  const [expandNotifications, setExpandNotifications] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadLightTypes(), loadTeamMembers(), loadNotificationPrefs()]);
    setLoading(false);
  }

  async function loadNotificationPrefs() {
    const user = await getCurrentUser();
    if (!user) return;
    setCurrentUser_state(user);
    const { data } = await supabase
      .from('team_members')
      .select('notify_area_complete, notify_job_complete, notify_job_notes')
      .eq('id', user.id)
      .single();
    if (data) {
      setNotifyAreaComplete(data.notify_area_complete);
      setNotifyJobComplete(data.notify_job_complete);
      setNotifyJobNotes(data.notify_job_notes);
    }
  }

  async function updateNotificationPref(field, value) {
    const user = await getCurrentUser();
    if (!user) return;
    await supabase.from('team_members').update({ [field]: value }).eq('id', user.id);
  }

  async function loadLightTypes() {
    const { data } = await supabase
      .from('light_types')
      .select('*')
      .order('category')
      .order('sort_order');
    if (data) setLightTypes(data);
  }

  async function loadTeamMembers() {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at');
    if (data) setTeamMembers(data);
  }

  async function addLightType() {
    if (!newTypeName.trim()) return;
    setSaving(true);
    const maxOrder = lightTypes.filter(t => t.category === newTypeCategory).length;
    await supabase.from('light_types').insert({
      name: newTypeName.trim(),
      category: newTypeCategory,
      sort_order: maxOrder + 1,
    });
    setNewTypeName('');
    await loadLightTypes();
    setSaving(false);
  }

  async function deleteLightType(id) {
    await supabase.from('light_types').delete().eq('id', id);
    await loadLightTypes();
  }

  function confirmDelete(id, name) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove "${name}" from the light types list?`)) {
        deleteLightType(id);
      }
    } else {
      Alert.alert('Remove light type', `Remove "${name}" from the list?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteLightType(id) },
      ]);
    }
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  const currentTypes = lightTypes.filter(t => t.category === 'current');
  const newTypes = lightTypes.filter(t => t.category === 'new');

  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.page}>
        <div style={webStyles.container}>

          {/* Header */}
          <div style={webStyles.header}>
            <button style={webStyles.backBtn} onClick={() => router.push('/home')}>
              ← Back
            </button>
            <div style={webStyles.headerTitle}>Settings</div>
          </div>

          {/* LIGHT TYPES */}
          <div style={webStyles.section}>
            <div
              style={webStyles.sectionHeader}
              onClick={() => setExpandLights(!expandLights)}
            >
              <div style={webStyles.sectionHeaderLeft}>
                <div style={webStyles.sectionIcon}>💡</div>
                <div>
                  <div style={webStyles.sectionTitle}>Manage light types</div>
                  <div style={webStyles.sectionSub}>Edit dropdown options for all jobs</div>
                </div>
              </div>
              <div style={webStyles.sectionCount}>{lightTypes.length} types</div>
              <div style={webStyles.chevron}>{expandLights ? '▲' : '▼'}</div>
            </div>

            {expandLights && (
              <div style={webStyles.expandPanel}>

                {/* Current types */}
                <div style={webStyles.typeGroupLabel}>Current lights</div>
                <div style={webStyles.tagWrap}>
                  {currentTypes.map(t => (
                    <div key={t.id} style={webStyles.tag}>
                      {t.name}
                      <span
                        style={webStyles.tagDel}
                        onClick={() => confirmDelete(t.id, t.name)}
                      >✕</span>
                    </div>
                  ))}
                </div>

                {/* New types */}
                <div style={{ ...webStyles.typeGroupLabel, marginTop: 16 }}>New LED lights</div>
                <div style={webStyles.tagWrap}>
                  {newTypes.map(t => (
                    <div key={t.id} style={webStyles.tag}>
                      {t.name}
                      <span
                        style={webStyles.tagDel}
                        onClick={() => confirmDelete(t.id, t.name)}
                      >✕</span>
                    </div>
                  ))}
                </div>

                {/* Add new type */}
                <div style={webStyles.addTypeRow}>
                  <input
                    style={webStyles.addTypeInput}
                    placeholder="Add new light type..."
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addLightType(); }}
                  />
                  <select
                    style={webStyles.categorySelect}
                    value={newTypeCategory}
                    onChange={e => setNewTypeCategory(e.target.value)}
                  >
                    <option value="current">Current</option>
                    <option value="new">New LED</option>
                  </select>
                  <button
                    style={{ ...webStyles.addTypeBtn, opacity: saving ? 0.6 : 1 }}
                    onClick={addLightType}
                    disabled={saving}
                  >
                    {saving ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* TEAM MEMBERS */}
          <div style={webStyles.section}>
            <div
              style={webStyles.sectionHeader}
              onClick={() => setExpandTeam(!expandTeam)}
            >
              <div style={webStyles.sectionHeaderLeft}>
                <div style={webStyles.sectionIcon}>👥</div>
                <div>
                  <div style={webStyles.sectionTitle}>Team members</div>
                  <div style={webStyles.sectionSub}>Manage who can log in</div>
                </div>
              </div>
              <div style={webStyles.sectionCount}>{teamMembers.length} members</div>
              <div style={webStyles.chevron}>{expandTeam ? '▲' : '▼'}</div>
            </div>

            {expandTeam && (
              <div style={webStyles.expandPanel}>
                {teamMembers.map(m => (
                  <div key={m.id} style={webStyles.memberRow}>
                    <div style={{
                      ...webStyles.avatar,
                      background: m.color + '22',
                      color: m.color,
                    }}>
                      {m.initials}
                    </div>
                    <div style={webStyles.memberInfo}>
                      <div style={webStyles.memberName}>
                        {m.name}
                        {m.role === 'owner' && (
                          <span style={webStyles.ownerBadge}>Owner</span>
                        )}
                      </div>
                      <div style={webStyles.memberRole}>{m.role} · PIN set</div>
                    </div>
                    <div style={webStyles.memberRole}>{m.role}</div>
                  </div>
                ))}
                <div style={webStyles.comingSoonNote}>
                  ℹ️ Adding and editing team members coming in next update
                </div>
              </div>
            )}
          </div>

          {/* NOTIFICATIONS */}
          <div style={webStyles.section}>
            <div style={webStyles.sectionHeader}>
              <div style={webStyles.sectionHeaderLeft}>
                <div style={webStyles.sectionIcon}>🔔</div>
                <div>
                  <div style={webStyles.sectionTitle}>Notifications</div>
                  <div style={webStyles.sectionSub}>Choose what you get notified about</div>
                </div>
              </div>
            </div>
            <div style={webStyles.expandPanel}>
              {[
                { label: 'Area marked complete', sub: 'When any area is finished', field: 'notify_area_complete', val: notifyAreaComplete, set: setNotifyAreaComplete },
                { label: 'Job fully complete', sub: 'When all areas in a job are done', field: 'notify_job_complete', val: notifyJobComplete, set: setNotifyJobComplete },
                { label: 'New job note added', sub: 'When someone adds a note to a job', field: 'notify_job_notes', val: notifyJobNotes, set: setNotifyJobNotes },
              ].map(pref => (
                <div key={pref.field} style={webStyles.toggleRow} onClick={() => { pref.set(!pref.val); updateNotificationPref(pref.field, !pref.val); }}>
                  <div>
                    <div style={webStyles.toggleLabel}>{pref.label}</div>
                    <div style={webStyles.toggleSub}>{pref.sub}</div>
                  </div>
                  <div style={{ ...webStyles.toggleTrack, background: pref.val ? Colors.blue : '#ccc' }}>
                    <div style={{ ...webStyles.toggleThumb, transform: pref.val ? 'translateX(16px)' : 'translateX(0)' }} />
                  </div>
                </div>
              ))}
              <div style={webStyles.comingSoonNote}>
                📱 Push notifications require the Expo Go app on mobile. Enable once and notifications arrive automatically.
              </div>
            </div>
          </div>

          {/* INTEGRATIONS */}
          <div style={webStyles.section}>
            <div style={webStyles.sectionHeader}>
              <div style={webStyles.sectionHeaderLeft}>
                <div style={webStyles.sectionIcon}>🔗</div>
                <div>
                  <div style={webStyles.sectionTitle}>Integrations</div>
                  <div style={webStyles.sectionSub}>Connect external services</div>
                </div>
              </div>
            </div>
            <div style={webStyles.expandPanel}>
              <div style={webStyles.integrationRow}>
                <div>
                  <div style={webStyles.integrationName}>QuickBooks</div>
                  <div style={webStyles.integrationSub}>Sync light types from your product list</div>
                </div>
                <div style={webStyles.comingSoonBadge}>Coming in V2</div>
              </div>
              <div style={webStyles.integrationRow}>
                <div>
                  <div style={webStyles.integrationName}>Push notifications</div>
                  <div style={webStyles.integrationSub}>Job reminders for team and customers</div>
                </div>
                <div style={webStyles.comingSoonBadge}>Coming in V2</div>
              </div>
            </div>
          </div>

          {/* LOG OUT */}
          <div style={webStyles.section}>
            <div
              style={{ ...webStyles.sectionHeader, cursor: 'pointer' }}
              onClick={() => {
              if (window.confirm('Are you sure you want to log out?')) {
                clearCurrentUser();
                router.replace('/');
              }
            }}
            >
              <div style={webStyles.sectionHeaderLeft}>
                <div style={webStyles.sectionIcon}>🚪</div>
                <div style={{ ...webStyles.sectionTitle, color: '#A32D2D' }}>Log out</div>
              </div>
            </div>
          </div>

          <div style={webStyles.version}>LED Pro · v1.0.0</div>
        </div>
      </div>
    );
  }

  // ── MOBILE VERSION ───────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/home')}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* LIGHT TYPES */}
        <TouchableOpacity
          style={styles.sectionRow}
          onPress={() => setExpandLights(!expandLights)}
        >
          <Text style={styles.sectionIcon}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Manage light types</Text>
            <Text style={styles.sectionSub}>{lightTypes.length} types</Text>
          </View>
          <Text style={styles.chevron}>{expandLights ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {expandLights && (
          <View style={styles.expandPanel}>
            <Text style={styles.typeGroupLabel}>Current lights</Text>
            <View style={styles.tagWrap}>
              {currentTypes.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.tag}
                  onPress={() => confirmDelete(t.id, t.name)}
                >
                  <Text style={styles.tagText}>{t.name} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.typeGroupLabel, { marginTop: 14 }]}>New LED lights</Text>
            <View style={styles.tagWrap}>
              {newTypes.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.tag}
                  onPress={() => confirmDelete(t.id, t.name)}
                >
                  <Text style={styles.tagText}>{t.name} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.addTypeRow}>
              <TextInput
                style={styles.addTypeInput}
                placeholder="Add new light type..."
                placeholderTextColor={Colors.textTertiary}
                value={newTypeName}
                onChangeText={setNewTypeName}
              />
              <TouchableOpacity
                style={[styles.categoryToggle, newTypeCategory === 'new' && styles.categoryToggleActive]}
                onPress={() => setNewTypeCategory(newTypeCategory === 'current' ? 'new' : 'current')}
              >
                <Text style={[styles.categoryToggleText, newTypeCategory === 'new' && { color: Colors.blue }]}>
                  {newTypeCategory === 'current' ? 'Current' : 'New LED'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addTypeBtn} onPress={addLightType}>
                <Text style={styles.addTypeBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* TEAM MEMBERS */}
        <TouchableOpacity
          style={styles.sectionRow}
          onPress={() => setExpandTeam(!expandTeam)}
        >
          <Text style={styles.sectionIcon}>👥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Team members</Text>
            <Text style={styles.sectionSub}>{teamMembers.length} members</Text>
          </View>
          <Text style={styles.chevron}>{expandTeam ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {expandTeam && (
          <View style={styles.expandPanel}>
            {teamMembers.map(m => (
              <View key={m.id} style={styles.memberRow}>
                <View style={[styles.avatar, { backgroundColor: m.color + '22' }]}>
                  <Text style={[styles.avatarText, { color: m.color }]}>{m.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberRole}>{m.role} · PIN set</Text>
                </View>
              </View>
            ))}
            <Text style={styles.comingSoonNote}>
              ℹ️ Adding team members coming in next update
            </Text>
          </View>
        )}

        {/* NOTIFICATIONS */}
        <TouchableOpacity
          style={styles.sectionRow}
          onPress={() => setExpandNotifications(!expandNotifications)}
        >
          <Text style={styles.sectionIcon}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <Text style={styles.sectionSub}>Choose what you get notified about</Text>
          </View>
          <Text style={styles.chevron}>{expandNotifications ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {expandNotifications && (
          <View style={styles.expandPanel}>
            {[
              { label: 'Area marked complete', field: 'notify_area_complete', val: notifyAreaComplete, set: setNotifyAreaComplete },
              { label: 'Job fully complete', field: 'notify_job_complete', val: notifyJobComplete, set: setNotifyJobComplete },
              { label: 'New job note', field: 'notify_job_notes', val: notifyJobNotes, set: setNotifyJobNotes },
            ].map(pref => (
              <View key={pref.field} style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{pref.label}</Text>
                <Switch
                  value={pref.val}
                  onValueChange={v => { pref.set(v); updateNotificationPref(pref.field, v); }}
                  trackColor={{ false: Colors.borderLight, true: Colors.blue }}
                  thumbColor="#fff"
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addTypeBtn, { marginTop: 12, width: '100%' }]}
              onPress={async () => {
                const user = await getCurrentUser();
                await registerForPushNotifications(user?.id);
              }}
            >
              <Text style={styles.addTypeBtnText}>Enable push notifications</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* INTEGRATIONS */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionIcon}>🔗</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Integrations</Text>
            <Text style={styles.sectionSub}>QuickBooks sync — coming in V2</Text>
          </View>
        </View>

        {/* LOG OUT */}
        <TouchableOpacity
          style={styles.sectionRow}
          onPress={() => {
            Alert.alert('Log out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log out', style: 'destructive', onPress: () => { clearCurrentUser(); router.replace('/'); } },
            ]);
          }}
        >
          <Text style={styles.sectionIcon}>🚪</Text>
          <Text style={[styles.sectionTitle, { color: '#A32D2D' }]}>Log out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>LED Pro · v1.0.0</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const webStyles = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 700, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary },
  headerTitle: { fontSize: 24, fontWeight: '600', color: Colors.textPrimary },
  section: { background: '#fff', borderRadius: 14, border: '0.5px solid #e0e7ef', marginBottom: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer' },
  sectionHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12, flex: 1 },
  sectionIcon: { fontSize: 20, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: Colors.bgSecondary, borderRadius: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  sectionSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  sectionCount: { fontSize: 12, color: Colors.textTertiary, marginRight: 8 },
  chevron: { fontSize: 12, color: Colors.textTertiary },
  expandPanel: { borderTop: '0.5px solid #f0f0f0', padding: '16px 20px' },
  typeGroupLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 },
  tagWrap: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: Colors.bgSecondary, border: '0.5px solid #e0e7ef', fontSize: 13, color: Colors.textSecondary },
  tagDel: { fontSize: 11, color: Colors.textTertiary, cursor: 'pointer', marginLeft: 2 },
  addTypeRow: { display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' },
  addTypeInput: { flex: 1, padding: '9px 12px', fontSize: 13, border: '0.5px solid #e0e7ef', borderRadius: 8, outline: 'none', fontFamily: 'inherit' },
  categorySelect: { padding: '9px 10px', fontSize: 13, border: '0.5px solid #e0e7ef', borderRadius: 8, outline: 'none', background: '#fff' },
  addTypeBtn: { padding: '9px 18px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: '500', cursor: 'pointer' },
  memberRow: { display: 'flex', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottom: '0.5px solid #f5f5f5' },
  avatar: { width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: '600' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  memberRole: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  ownerBadge: { fontSize: 10, color: Colors.blue, background: '#E6F1FB', padding: '1px 8px', borderRadius: 20, marginLeft: 8 },
  comingSoonNote: { fontSize: 12, color: Colors.textTertiary, marginTop: 12, padding: '8px 12px', background: Colors.bgSecondary, borderRadius: 8 },
  integrationRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, marginBottom: 14, borderBottom: '0.5px solid #f5f5f5' },
  integrationName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  integrationSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  comingSoonBadge: { fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#F0F0EE', color: '#888' },
  version: { textAlign: 'center', fontSize: 11, color: Colors.textTertiary, marginTop: 24 },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { padding: 20, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { fontSize: 14, color: Colors.blue },
  headerTitle: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 0.5, borderColor: Colors.borderLight },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  sectionSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  chevron: { fontSize: 12, color: Colors.textTertiary },
  expandPanel: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 0.5, borderColor: Colors.borderLight },
  typeGroupLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.borderLight },
  tagText: { fontSize: 12, color: Colors.textSecondary },
  addTypeRow: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' },
  addTypeInput: { flex: 1, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 8, padding: 10, fontSize: 13, color: Colors.textPrimary, backgroundColor: '#fff' },
  categoryToggle: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: Colors.borderLight, backgroundColor: '#fff' },
  categoryToggleActive: { borderColor: Colors.blue, backgroundColor: '#E6F1FB' },
  categoryToggleText: { fontSize: 12, color: Colors.textSecondary },
  addTypeBtn: { backgroundColor: Colors.blue, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  addTypeBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '600' },
  memberName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  memberRole: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  comingSoonNote: { fontSize: 12, color: Colors.textTertiary, marginTop: 12, padding: 10, backgroundColor: Colors.bgSecondary, borderRadius: 8 },
  version: { textAlign: 'center', fontSize: 11, color: Colors.textTertiary, marginTop: 24 },
});