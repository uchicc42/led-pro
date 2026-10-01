import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { registerForPushNotifications } from '../../constants/notifications';
import { clearCurrentUser, getCurrentUser } from '../../constants/userStore';
import { useSettings } from './useSettings';

// Native UI. The web UI lives in SettingsScreen.web.tsx; Metro picks the right file per platform.

export default function SettingsScreen() {
  const {
    lightTypes, teamMembers, newTypeName, setNewTypeName, newTypeCategory, setNewTypeCategory,
    loading, saving, expandLights, setExpandLights, expandTeam, setExpandTeam, currentUser,
    notifyAreaComplete, setNotifyAreaComplete, notifyJobComplete, setNotifyJobComplete,
    notifyJobNotes, setNotifyJobNotes, expandNotifications, setExpandNotifications,
    updateNotificationPref, addLightType, deleteLightType, currentTypes, newTypes,
  } = useSettings();

  function confirmDelete(id: string, name: string) {
    Alert.alert('Remove light type', `Remove "${name}" from the list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteLightType(id) },
    ]);
  }

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

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  toggleLabel: { fontSize: 13, color: Colors.textPrimary },
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
