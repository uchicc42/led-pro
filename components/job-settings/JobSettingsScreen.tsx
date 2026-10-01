import { router } from 'expo-router';
import {
  ActivityIndicator,
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
import { useJobSettings } from './useJobSettings';

// Native UI. The web UI lives in JobSettingsScreen.web.tsx; Metro picks the right file per platform.

export default function JobSettingsScreen() {
  const {
    loading, name, setName, location, setLocation, date, setDate, mode, setMode,
    columns, saving, error, isReady, save, backHref,
  } = useJobSettings();

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(backHref as any)}>
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

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Features for this job</Text>
        {columns.map((col) => (
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
        <Text style={styles.hint}>Turning a feature off hides it but keeps any data already entered.</Text>

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

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.saveBtn, (!isReady || saving) && { opacity: 0.5 }]}
          onPress={save}
          disabled={!isReady || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save settings</Text>
          }
        </TouchableOpacity>

      </ScrollView>
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
  sectionLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
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
  errorText: { color: '#A32D2D', fontSize: 13, marginBottom: 12 },
  saveBtn: { backgroundColor: Colors.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
