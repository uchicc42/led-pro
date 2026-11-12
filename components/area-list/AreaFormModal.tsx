import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import type { AreaForm } from './useAreaForm';

// Native "New area" / "Duplicate" box. The web version is AreaFormModal.web.tsx.

type Props = {
  form: AreaForm | null;
  parentOptions: { id: string; name: string }[];
  setName: (name: string) => void;
  setParent: (parentId: string | null) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export default function AreaFormModal({ form, parentOptions, setName, setParent, onSubmit, onClose }: Props) {
  const duplicating = form?.mode === 'duplicate';
  const places = [{ id: null as string | null, name: 'Top level' }, ...parentOptions];

  return (
    <Modal visible={!!form} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cancel" />
        <View style={styles.box}>
          <Text style={styles.title}>{duplicating ? 'Duplicate area' : 'New area'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Name (e.g. Gym, Suite 220, Office A)"
            placeholderTextColor={Colors.textTertiary}
            value={form?.name ?? ''}
            onChangeText={setName}
            autoFocus
            selectTextOnFocus={duplicating}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />

          {parentOptions.length > 0 && (
            <>
              <Text style={styles.label}>Put it in</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} keyboardShouldPersistTaps="handled">
                {places.map(p => {
                  const active = (form?.parentId ?? null) === p.id;
                  return (
                    <TouchableOpacity key={p.id ?? 'top'} style={[styles.chip, active && styles.chipActive]} onPress={() => setParent(p.id)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                        {p.id ? `› ${p.name}` : p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {duplicating && (
            <Text style={styles.note}>
              Copies the light rows, sensors, photocells and dimmers. Photos, notes, rooms and progress start fresh.
            </Text>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.confirm, !form?.name.trim() && { opacity: 0.5 }]} onPress={onSubmit} disabled={!form?.name.trim()}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>{duplicating ? 'Duplicate' : 'Add'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.35)' },
  box: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: Colors.borderLight, width: '100%', maxWidth: 480, alignSelf: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 10 },
  input: { borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 8, padding: 10, fontSize: 14, color: Colors.textPrimary, marginBottom: 12 },
  label: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  chipRow: { marginBottom: 12, flexGrow: 0 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.borderLight, backgroundColor: '#fff', marginRight: 8, maxWidth: 200 },
  chipActive: { backgroundColor: '#E6F1FB', borderColor: Colors.blue },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: '#0C447C', fontWeight: '500' },
  note: { fontSize: 12, color: Colors.textTertiary, marginBottom: 12 },
  buttons: { flexDirection: 'row', gap: 10 },
  confirm: { flex: 1, backgroundColor: Colors.blue, borderRadius: 8, padding: 10, alignItems: 'center' },
  cancel: { flex: 1, backgroundColor: Colors.bgSecondary, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.borderLight },
});
