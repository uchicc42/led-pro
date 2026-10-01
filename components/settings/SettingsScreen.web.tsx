import { router } from 'expo-router';
import type { CSSProperties } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { clearCurrentUser } from '../../constants/userStore';
import { useSettings } from './useSettings';

// Web-only UI built with DOM elements. Metro only bundles this file for web; native uses SettingsScreen.tsx.

export default function SettingsScreen() {
  const {
    lightTypes, teamMembers, newTypeName, setNewTypeName, newTypeCategory, setNewTypeCategory,
    loading, saving, expandLights, setExpandLights, expandTeam, setExpandTeam, currentUser,
    notifyAreaComplete, setNotifyAreaComplete, notifyJobComplete, setNotifyJobComplete,
    notifyJobNotes, setNotifyJobNotes, expandNotifications, setExpandNotifications,
    updateNotificationPref, addLightType, deleteLightType, currentTypes, newTypes,
    expandControls, setExpandControls, newControlName, setNewControlName,
    newControlKind, setNewControlKind, addControlType, deleteControlType, sensorTypes, photocellTypes,
  } = useSettings();

  function confirmDelete(id: string, name: string, remove: (id: string) => void = deleteLightType) {
    if (window.confirm(`Remove "${name}" from the list?`)) {
      remove(id);
    }
  }

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

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

        {/* SENSOR & PHOTOCELL TYPES */}
        <div style={webStyles.section}>
          <div style={webStyles.sectionHeader} onClick={() => setExpandControls(!expandControls)}>
            <div style={webStyles.sectionHeaderLeft}>
              <div style={webStyles.sectionIcon}>📡</div>
              <div>
                <div style={webStyles.sectionTitle}>Sensor & photocell types</div>
                <div style={webStyles.sectionSub}>Dropdown options for occupancy sensors and photocells</div>
              </div>
            </div>
            <div style={webStyles.sectionCount}>{sensorTypes.length + photocellTypes.length} types</div>
            <div style={webStyles.chevron}>{expandControls ? '▲' : '▼'}</div>
          </div>

          {expandControls && (
            <div style={webStyles.expandPanel}>
              <div style={webStyles.typeGroupLabel}>Occupancy sensors</div>
              <div style={webStyles.tagWrap}>
                {sensorTypes.map(t => (
                  <div key={t.id} style={webStyles.tag}>
                    {t.name}
                    <span style={webStyles.tagDel} onClick={() => confirmDelete(t.id, t.name, deleteControlType)}>✕</span>
                  </div>
                ))}
              </div>

              <div style={{ ...webStyles.typeGroupLabel, marginTop: 16 }}>Photocells</div>
              <div style={webStyles.tagWrap}>
                {photocellTypes.map(t => (
                  <div key={t.id} style={webStyles.tag}>
                    {t.name}
                    <span style={webStyles.tagDel} onClick={() => confirmDelete(t.id, t.name, deleteControlType)}>✕</span>
                  </div>
                ))}
              </div>

              <div style={webStyles.addTypeRow}>
                <input
                  style={webStyles.addTypeInput}
                  placeholder="Add new type..."
                  value={newControlName}
                  onChange={e => setNewControlName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addControlType(); }}
                />
                <select
                  style={webStyles.categorySelect}
                  value={newControlKind}
                  onChange={e => setNewControlKind(e.target.value as 'occupancy' | 'photocell')}
                >
                  <option value="occupancy">Sensor</option>
                  <option value="photocell">Photocell</option>
                </select>
                <button
                  style={{ ...webStyles.addTypeBtn, opacity: saving ? 0.6 : 1 }}
                  onClick={addControlType}
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

const webStyles: Record<string, CSSProperties> = {
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
  memberRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid #f5f5f5' },
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
  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #f5f5f5', cursor: 'pointer' },
  toggleLabel: { fontSize: 13, color: Colors.textPrimary },
};
