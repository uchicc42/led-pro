import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { KeyboardScrollView } from '../ui/keyboard-scroll-view';
import { useJobSettings } from './useJobSettings';

// Native UI. The web UI lives in JobSettingsScreen.web.tsx; Metro picks the right file per platform.

export default function JobSettingsScreen() {
  const {
    loading, name, setName, location, setLocation, date, setDate, mode, setMode,
    columns, saving, error, isReady, detailsDirty, savedFlash,
    saveDetails, saveAndGoBack, goBack,
  } = useJobSettings();

  function handleBack() {
    if (!detailsDirty) return goBack();
    Alert.alert('Unsaved changes', 'Save your changes to the job name, location or date?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: goBack },
      { text: 'Save', onPress: saveAndGoBack },
    ]);
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job settings</Text>
          <View style={{ width: 50 }} />
        </View>

        <Text style={styles.fieldLabel}>Job name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Fort Cherry Elementary"
          placeholderTextColor={Colors.textTertiary}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.fieldLabel}>Location / address *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Fort Cherry, PA"
          placeholderTextColor={Colors.textTertiary}
          value={location}
          onChangeText={setLocation}
        />

        <Text style={styles.fieldLabel}>Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textTertiary}
          value={date}
          onChangeText={setDate}
        />

        {detailsDirty && (
          <TouchableOpacity
            style={[styles.saveBtn, (!isReady || saving) && { opacity: 0.5 }]}
            onPress={saveDetails}
            disabled={!isReady || saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save details</Text>}
          </TouchableOpacity>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.divider} />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Features for this job</Text>
          {savedFlash && <Text style={styles.savedFlash}>✓ Saved</Text>}
        </View>
        {columns.map((col) => (
          <View key={col.field} style={styles.toggleRow}>
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
        <Text style={styles.hint}>
          Switches save as soon as you change them. Turning a feature off hides it but keeps any data already entered.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Mode</Text>
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

      </KeyboardScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { padding: 20, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { fontSize: 14, color: Colors.blue },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  fieldLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: Colors.borderLight, padding: 12, fontSize: 14, color: Colors.textPrimary },
  divider: { height: 0.5, backgroundColor: Colors.borderLight, marginVertical: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  savedFlash: { fontSize: 12, color: Colors.green, fontWeight: '500', marginBottom: 12 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  toggleLabel: { fontSize: 13, color: Colors.textPrimary },
  toggleSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  hint: { fontSize: 11, color: Colors.textTertiary, marginTop: 10 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  modeCard: { flex: 1, borderWidth: 1.5, borderColor: Colors.borderLight, borderRadius: 12, padding: 14, alignItems: 'center' },
  modeCardActive: { borderColor: Colors.blue, backgroundColor: '#E6F1FB' },
  modeIcon: { fontSize: 22, marginBottom: 6 },
  modeName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  modeSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, textAlign: 'center' },
  errorText: { color: '#A32D2D', fontSize: 13, marginTop: 12 },
  saveBtn: { backgroundColor: Colors.blue, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 14 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
