import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator, Platform,
    SafeAreaView, ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../supabase';

export default function NewJobScreen() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState('counting');
  const [colSensor, setColSensor] = useState(false);
  const [colPhotocell, setColPhotocell] = useState(false);
  const [colLayout, setColLayout] = useState(false);
  const [colHours, setColHours] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isReady = name.trim() && location.trim() && date;

  async function createJob() {
    if (!isReady) return;
    setSaving(true);
    setError('');

    const { data, error: err } = await supabase
      .from('jobs')
      .insert({
        name: name.trim(),
        location: location.trim(),
        date,
        mode,
        status: 'active',
        col_sensor: colSensor,
        col_photocell: colPhotocell,
        col_layout: colLayout,
        col_hours: colHours,
      })
      .select()
      .single();

    setSaving(false);

    if (err) {
      setError('Failed to create job. Please try again.');
      return;
    }

    router.replace('/home');
  }

  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.page}>
        <div style={webStyles.container}>

          {/* Header */}
          <div style={webStyles.header}>
            <button style={webStyles.backBtn} onClick={() => router.back()}>
              ← Back
            </button>
            <div style={webStyles.headerTitle}>New job</div>
          </div>

          <div style={webStyles.card}>

            {/* Job name */}
            <div style={webStyles.fieldGroup}>
              <div style={webStyles.fieldLabel}>Job name *</div>
              <input
                style={webStyles.input}
                placeholder="e.g. Fort Cherry Elementary"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Location */}
            <div style={webStyles.fieldGroup}>
              <div style={webStyles.fieldLabel}>Location / address *</div>
              <input
                style={webStyles.input}
                placeholder="e.g. Fort Cherry, PA"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>

            {/* Date */}
            <div style={webStyles.fieldGroup}>
              <div style={webStyles.fieldLabel}>Date *</div>
              <input
                style={webStyles.input}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div style={webStyles.divider} />

            {/* Variable columns */}
            <div style={webStyles.sectionLabel}>Variable columns for this job</div>

            {[
              { label: 'Occupancy sensor', sub: 'Qty + type column', val: colSensor, set: setColSensor },
              { label: 'Photocell', sub: 'Photocell quantity column', val: colPhotocell, set: setColPhotocell },
              { label: 'Room layout / exhibit', sub: 'Ceiling diagram per area', val: colLayout, set: setColLayout },
              { label: 'Hours-based flag', sub: 'Color-code limited-hour lights', val: colHours, set: setColHours },
            ].map((col) => (
              <div
                key={col.label}
                style={webStyles.toggleRow}
                onClick={() => col.set(!col.val)}
              >
                <div>
                  <div style={webStyles.toggleLabel}>{col.label}</div>
                  <div style={webStyles.toggleSub}>{col.sub}</div>
                </div>
                <div style={{ ...webStyles.toggleTrack, background: col.val ? Colors.blue : '#ccc' }}>
                  <div style={{ ...webStyles.toggleThumb, transform: col.val ? 'translateX(16px)' : 'translateX(0)' }} />
                </div>
              </div>
            ))}

            <div style={webStyles.divider} />

            {/* Mode selector */}
            <div style={webStyles.sectionLabel}>Starting mode</div>
            <div style={webStyles.modeRow}>
              <div
                style={{ ...webStyles.modeCard, ...(mode === 'counting' ? webStyles.modeCardActive : {}) }}
                onClick={() => setMode('counting')}
              >
                <div style={webStyles.modeIcon}>📋</div>
                <div style={webStyles.modeName}>Counting</div>
                <div style={webStyles.modeSub}>Survey & count lights</div>
              </div>
              <div
                style={{ ...webStyles.modeCard, ...(mode === 'electrician' ? { ...webStyles.modeCardActive, borderColor: Colors.coral } : {}) }}
                onClick={() => setMode('electrician')}
              >
                <div style={webStyles.modeIcon}>🔧</div>
                <div style={webStyles.modeName}>Electrician</div>
                <div style={webStyles.modeSub}>Track installation</div>
              </div>
            </div>

            {error && <div style={webStyles.errorText}>{error}</div>}

            {/* Create button */}
            <button
              style={{
                ...webStyles.createBtn,
                opacity: isReady && !saving ? 1 : 0.5,
                cursor: isReady && !saving ? 'pointer' : 'not-allowed',
              }}
              onClick={createJob}
              disabled={!isReady || saving}
            >
              {saving ? 'Creating...' : 'Create job'}
            </button>
          </div>
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
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New job</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Job name */}
        <Text style={styles.fieldLabel}>Job name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Fort Cherry Elementary"
          placeholderTextColor={Colors.textTertiary}
          value={name}
          onChangeText={setName}
        />

        {/* Location */}
        <Text style={styles.fieldLabel}>Location / address *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Fort Cherry, PA"
          placeholderTextColor={Colors.textTertiary}
          value={location}
          onChangeText={setLocation}
        />

        {/* Date */}
        <Text style={styles.fieldLabel}>Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textTertiary}
          value={date}
          onChangeText={setDate}
        />

        <View style={styles.divider} />

        {/* Variable columns */}
        <Text style={styles.sectionLabel}>Variable columns</Text>

        {[
          { label: 'Occupancy sensor', sub: 'Qty + type column', val: colSensor, set: setColSensor },
          { label: 'Photocell', sub: 'Photocell quantity column', val: colPhotocell, set: setColPhotocell },
          { label: 'Room layout / exhibit', sub: 'Ceiling diagram per area', val: colLayout, set: setColLayout },
          { label: 'Hours-based flag', sub: 'Color-code limited-hour lights', val: colHours, set: setColHours },
        ].map((col) => (
          <View key={col.label} style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>{col.label}</Text>
              <Text style={styles.toggleSub}>{col.sub}</Text>
            </View>
            <Switch
              value={col.val}
              onValueChange={col.set}
              trackColor={{ false: Colors.borderLight, true: Colors.blue }}
              thumbColor="#fff"
            />
          </View>
        ))}

        <View style={styles.divider} />

        {/* Mode selector */}
        <Text style={styles.sectionLabel}>Starting mode</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeCard, mode === 'counting' && styles.modeCardActive]}
            onPress={() => setMode('counting')}
          >
            <Text style={styles.modeIcon}>📋</Text>
            <Text style={styles.modeName}>Counting</Text>
            <Text style={styles.modeSub}>Survey & count lights</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeCard, mode === 'electrician' && { ...styles.modeCardActive, borderColor: Colors.coral }]}
            onPress={() => setMode('electrician')}
          >
            <Text style={styles.modeIcon}>🔧</Text>
            <Text style={styles.modeName}>Electrician</Text>
            <Text style={styles.modeSub}>Track installation</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.createBtn, (!isReady || saving) && { opacity: 0.5 }]}
          onPress={createJob}
          disabled={!isReady || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.createBtnText}>Create job</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const webStyles = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 600, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary },
  headerTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  card: { background: '#fff', borderRadius: 16, padding: '32px', border: '0.5px solid #e0e7ef', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 40 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14, border: '0.5px solid #e0e7ef', borderRadius: 8, outline: 'none', color: Colors.textPrimary, fontFamily: 'inherit' },
  divider: { borderTop: '0.5px solid #f0f0f0', margin: '20px 0' },
  sectionLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 },
  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #f5f5f5', cursor: 'pointer' },
  toggleLabel: { fontSize: 13, color: Colors.textPrimary, marginBottom: 2 },
  toggleSub: { fontSize: 11, color: '#aaa' },
  toggleTrack: { width: 36, height: 20, borderRadius: 10, position: 'relative', transition: 'background 0.2s', flexShrink: 0 },
  toggleThumb: { position: 'absolute', top: 3, left: 3, width: 14, height: 14, borderRadius: 7, background: '#fff', transition: 'transform 0.2s' },
  modeRow: { display: 'flex', gap: 12, marginBottom: 24 },
  modeCard: { flex: 1, border: '1.5px solid #e0e7ef', borderRadius: 12, padding: '16px 12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' },
  modeCardActive: { borderColor: Colors.blue, background: '#E6F1FB' },
  modeIcon: { fontSize: 24, marginBottom: 8 },
  modeName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, marginBottom: 4 },
  modeSub: { fontSize: 11, color: '#aaa' },
  errorText: { color: '#A32D2D', fontSize: 13, marginBottom: 12 },
  createBtn: { width: '100%', padding: '14px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: '500', cursor: 'pointer', marginTop: 8 },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { fontSize: 14, color: Colors.blue },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  fieldLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: Colors.borderLight, padding: 12, fontSize: 14, color: Colors.textPrimary },
  divider: { height: 0.5, backgroundColor: Colors.borderLight, marginVertical: 20 },
  sectionLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  toggleLabel: { fontSize: 13, color: Colors.textPrimary },
  toggleSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  modeCard: { flex: 1, borderWidth: 1.5, borderColor: Colors.borderLight, borderRadius: 12, padding: 14, alignItems: 'center' },
  modeCardActive: { borderColor: Colors.blue, backgroundColor: '#E6F1FB' },
  modeIcon: { fontSize: 22, marginBottom: 6 },
  modeName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  modeSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, textAlign: 'center' },
  errorText: { color: '#A32D2D', fontSize: 13, marginBottom: 12 },
  createBtn: { backgroundColor: Colors.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});