import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { AreaEntryState, PickerTarget, useAreaEntry } from './useAreaEntry';

// Native (iOS/Android) UI. The web UI lives in AreaEntryScreen.web.tsx; Metro picks the right file per platform.

type TypePickerModalProps = {
  visible: boolean;
  target: PickerTarget;
  lightTypes: AreaEntryState['lightTypes'];
  onSelect: (item: string) => void;
  onClose: () => void;
};

function TypePickerModal({ visible, target, lightTypes, onSelect, onClose }: TypePickerModalProps) {
  const [search, setSearch] = useState('');
  const options = target.field === 'oldType' ? lightTypes.current : lightTypes.new;
  const filtered = options.filter(t => t.toLowerCase().includes(search.toLowerCase()));

  function close() {
    setSearch('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={close} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {target.field === 'oldType' ? 'Current light type' : 'New light type'}
              </Text>
              <TouchableOpacity onPress={close}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchWrap}>
              <Text style={styles.modalSearchIcon}>🔍</Text>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search..."
                placeholderTextColor={Colors.textTertiary}
                value={search}
                onChangeText={setSearch}
                autoFocus
                clearButtonMode="while-editing"
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={item => item}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 220 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => { onSelect(item); close(); }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>No results for &quot;{search}&quot;</Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function AreaEntryScreen() {
  const {
    area, job, rows, notes, setNotes, isComplete, lightTypes, saving, loading,
    save, addRow, removeRow, updateRow, backToAreaList, layoutCanvasHref,
  } = useAreaEntry();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>({ rowIndex: 0, field: 'oldType' });

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TypePickerModal
        visible={pickerVisible}
        target={pickerTarget}
        lightTypes={lightTypes}
        onSelect={item => updateRow(pickerTarget.rowIndex, pickerTarget.field, item)}
        onClose={() => setPickerVisible(false)}
      />
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(backToAreaList as any)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{area?.name}</Text>
          <View style={{ width: 50 }} />
        </View>

        <Text style={styles.sectionLabel}>Light replacements</Text>

        {rows.map((row, i) => (
          <View key={i} style={styles.rowBlock}>
            {/* Old side */}
            {!row.newAddition && (
              <View style={styles.rowSection}>
                <Text style={styles.rowSectionLabel}>Current</Text>
                <View style={styles.rowInputLine}>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="numeric"
                    value={row.oldQty}
                    onChangeText={v => updateRow(i, 'oldQty', v)}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <TouchableOpacity
                    style={styles.typePickerWrap}
                    onPress={() => { setPickerTarget({ rowIndex: i, field: 'oldType' }); setPickerVisible(true); }}
                  >
                    <Text style={[styles.typeText, !!row.oldType && { color: Colors.textPrimary }]} numberOfLines={1}>
                      {row.oldType || 'Select type...'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!row.newAddition && !row.removedOnly && (
              <View style={styles.arrowRow}>
                <Text style={styles.arrowText}>↓ replaced by</Text>
              </View>
            )}

            {row.removedOnly && (
              <View style={styles.arrowRow}>
                <Text style={[styles.arrowText, { color: Colors.coral }]}>↓ removed, not replaced</Text>
              </View>
            )}

            {/* New side */}
            {!row.removedOnly && (
              <View style={styles.rowSection}>
                <Text style={styles.rowSectionLabel}>New</Text>
                <View style={styles.rowInputLine}>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="numeric"
                    value={row.newQty}
                    onChangeText={v => updateRow(i, 'newQty', v)}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <TouchableOpacity
                    style={styles.typePickerWrap}
                    onPress={() => { setPickerTarget({ rowIndex: i, field: 'newType' }); setPickerVisible(true); }}
                  >
                    <Text style={[styles.typeText, !!row.newType && { color: Colors.textPrimary }]} numberOfLines={1}>
                      {row.newType || 'Select type...'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Flags */}
            <View style={styles.flagsRow}>
              <TouchableOpacity
                style={[styles.flagBtn, row.removedOnly && styles.flagBtnActive]}
                onPress={() => updateRow(i, 'removedOnly', !row.removedOnly)}
              >
                <Text style={[styles.flagBtnText, row.removedOnly && { color: Colors.coral }]}>
                  Removed only
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.flagBtn, row.newAddition && styles.flagBtnActive]}
                onPress={() => updateRow(i, 'newAddition', !row.newAddition)}
              >
                <Text style={[styles.flagBtnText, row.newAddition && { color: Colors.blue }]}>
                  New addition
                </Text>
              </TouchableOpacity>
              {job?.col_hours && (
                <TouchableOpacity
                  style={[styles.flagBtn, row.hoursOn && { borderColor: '#EF9F27', backgroundColor: '#FAEEDA' }]}
                  onPress={() => updateRow(i, 'hoursOn', !row.hoursOn)}
                >
                  <Text style={[styles.flagBtnText, row.hoursOn && { color: '#854F0B' }]}>⏱ Hours</Text>
                </TouchableOpacity>
              )}
            </View>

            {row.hoursOn && job?.col_hours && (
              <View style={styles.hoursExpand}>
                <Text style={styles.hoursLabel}>Operating hours</Text>
                <View style={styles.hoursRow}>
                  <TextInput style={styles.timeInput} value={row.hoursStart} onChangeText={v => updateRow(i, 'hoursStart', v)} placeholder="06:00" placeholderTextColor={Colors.textTertiary} />
                  <Text style={styles.timeSep}>to</Text>
                  <TextInput style={styles.timeInput} value={row.hoursEnd} onChangeText={v => updateRow(i, 'hoursEnd', v)} placeholder="18:00" placeholderTextColor={Colors.textTertiary} />
                </View>
              </View>
            )}

            {/* Remove row button */}
            {rows.length > 1 && (
              <TouchableOpacity style={styles.removeRowBtn} onPress={() => removeRow(i)}>
                <Text style={styles.removeRowBtnText}>Remove row</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
          <Text style={styles.addRowBtnText}>+ Add light row</Text>
        </TouchableOpacity>

        {job?.col_layout && (
          <TouchableOpacity
            style={styles.layoutBtn}
            onPress={() => router.push(layoutCanvasHref as any)}
          >
            <Text style={styles.layoutBtnText}>🗺 Open ceiling layout</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          numberOfLines={3}
          placeholder="Add any notes about this area..."
          placeholderTextColor={Colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={() => save(false)} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.doneBtn, isComplete && styles.doneBtnActive]} onPress={() => save(true)} disabled={saving}>
          <Text style={[styles.doneBtnText, isComplete && { color: Colors.green }]}>
            {isComplete ? '✓ Area complete' : 'Mark as complete'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { padding: 20, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { fontSize: 14, color: Colors.blue },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  sectionLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  rowBlock: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: Colors.borderLight, padding: 14, marginBottom: 10 },
  rowSection: { marginBottom: 6 },
  rowSectionLabel: { fontSize: 10, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  rowInputLine: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  qtyInput: { width: 60, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 8, padding: 8, fontSize: 13, color: Colors.textPrimary, textAlign: 'center', backgroundColor: Colors.bgSecondary },
  typePickerWrap: { flex: 1, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 8, padding: 10, backgroundColor: Colors.bgSecondary, justifyContent: 'center', minHeight: 40 },
  typeText: { fontSize: 12, color: Colors.textTertiary },
  arrowRow: { alignItems: 'center', paddingVertical: 4 },
  arrowText: { fontSize: 12, color: Colors.textTertiary },
  flagsRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  flagBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.borderLight, backgroundColor: Colors.bgSecondary },
  flagBtnActive: { borderColor: Colors.coral, backgroundColor: '#FAECE7' },
  flagBtnText: { fontSize: 11, color: Colors.textSecondary },
  hoursExpand: { backgroundColor: '#FAEEDA', padding: 10, borderRadius: 8, marginTop: 8 },
  hoursLabel: { fontSize: 10, color: '#854F0B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { borderWidth: 0.5, borderColor: '#EF9F27', borderRadius: 6, padding: 6, fontSize: 12, color: '#412402', backgroundColor: '#fff', width: 80 },
  timeSep: { fontSize: 12, color: '#854F0B' },
  removeRowBtn: { marginTop: 8, alignItems: 'center', padding: 6 },
  removeRowBtnText: { fontSize: 12, color: '#A32D2D' },
  addRowBtn: { borderWidth: 1, borderColor: '#c0cfe0', borderStyle: 'dashed', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 10 },
  addRowBtnText: { fontSize: 12, color: Colors.blue },
  layoutBtn: { borderWidth: 1, borderColor: '#AFA9EC', borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 10 },
  layoutBtnText: { fontSize: 13, color: '#534AB7' },
  divider: { height: 0.5, backgroundColor: Colors.borderLight, marginVertical: 16 },
  notesInput: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 10, padding: 12, fontSize: 13, color: Colors.textPrimary, minHeight: 80, marginTop: 8 },
  saveBtn: { backgroundColor: Colors.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  doneBtn: { borderWidth: 0.5, borderColor: Colors.green, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8, backgroundColor: '#fff' },
  doneBtnActive: { backgroundColor: '#E1F5EE' },
  doneBtnText: { fontSize: 14, color: Colors.teal },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  modalTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  modalClose: { fontSize: 14, color: Colors.blue, fontWeight: '500' },
  modalSearchWrap: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight, backgroundColor: Colors.bgSecondary },
  modalSearchIcon: { fontSize: 14, marginRight: 8 },
  modalSearchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, padding: 0 },
  modalItem: { padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  modalItemText: { fontSize: 14, color: Colors.textPrimary },
  modalEmpty: { padding: 32, alignItems: 'center' },
  modalEmptyText: { fontSize: 14, color: Colors.textTertiary },
});
