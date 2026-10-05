import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { MEMBER_COLORS, Member, ROLES, useTeam } from './useTeam';

// Team section of Settings (phone). The web version is TeamSection.web.tsx.

const roleLabel = (role: string) => ROLES.find(r => r.key === role)?.label ?? role;

export default function TeamSection() {
  const {
    online, members, loaded, me, isOwner, editor, saving, error, setError, notice,
    startAdd, startEdit, updateEditor, closeEditor, saveEditor, removeMember, changeOwnPin,
  } = useTeam();
  const [expanded, setExpanded] = useState(false);
  const [ownPin, setOwnPin] = useState<string | null>(null);

  function confirmRemove(m: { id?: string; name: string }) {
    if (!m.id) return;
    Alert.alert('Remove team member', `Remove ${m.name}? They won't be able to log in. Their name stays on past work.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMember(m.id!) },
    ]);
  }

  async function saveOwnPin() {
    if (ownPin !== null && await changeOwnPin(ownPin)) setOwnPin(null);
  }

  return (
    <>
      <TouchableOpacity style={styles.sectionRow} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.sectionIcon}>👥</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Team members</Text>
          <Text style={styles.sectionSub}>{loaded ? `${members.length} members` : 'Who can log in'}</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.panel}>
          {!online ? (
            <Text style={styles.hint}>📵 Managing the team needs signal.</Text>
          ) : !loaded ? (
            <ActivityIndicator color={Colors.blue} />
          ) : (
            <>
              {members.map((m: Member) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.memberRow}
                  disabled={!isOwner}
                  onPress={() => startEdit(m)}
                >
                  <View style={[styles.avatar, { backgroundColor: m.color + '22' }]}>
                    <Text style={[styles.avatarText, { color: m.color }]}>{m.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.name}{m.id === me?.id ? ' (you)' : ''}</Text>
                    <Text style={styles.memberRole}>{roleLabel(m.role)}</Text>
                  </View>
                  {isOwner && <Text style={styles.editLink}>Edit</Text>}
                </TouchableOpacity>
              ))}

              {!!notice && <Text style={styles.notice}>{notice}</Text>}
              {!!error && !editor && <Text style={styles.error}>{error}</Text>}

              {ownPin === null ? (
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setError(''); setOwnPin(''); }}>
                  <Text style={styles.secondaryBtnText}>🔑 Change my PIN</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.pinRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={ownPin}
                    onChangeText={v => setOwnPin(v.replace(/\D/g, '').slice(0, 4))}
                    placeholder="New 4-digit PIN"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.primaryBtnSmall} onPress={saveOwnPin} disabled={saving}>
                    <Text style={styles.primaryBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setOwnPin(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                </View>
              )}

              {isOwner && (
                <TouchableOpacity style={styles.addBtn} onPress={startAdd}>
                  <Text style={styles.addBtnText}>+ Add team member</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      <Modal visible={!!editor} transparent animationType="slide" onRequestClose={closeEditor}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeEditor} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {editor && (
              <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>{editor.mode === 'add' ? 'Add team member' : `Edit ${editor.name || 'member'}`}</Text>
                  <TouchableOpacity onPress={closeEditor}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                </View>

                <Text style={styles.label}>Name</Text>
                <TextInput style={styles.input} value={editor.name} onChangeText={name => updateEditor({ name })} placeholder="e.g. Sam Carter" placeholderTextColor={Colors.textTertiary} />

                <Text style={styles.label}>Initials</Text>
                <TextInput style={[styles.input, { width: 90 }]} value={editor.initials} onChangeText={initials => updateEditor({ initials: initials.toUpperCase().slice(0, 3) })} autoCapitalize="characters" maxLength={3} />

                <Text style={styles.label}>Colour</Text>
                <View style={styles.swatches}>
                  {MEMBER_COLORS.map(c => (
                    <TouchableOpacity key={c} onPress={() => updateEditor({ color: c })} style={[styles.swatch, { backgroundColor: c }, editor.color === c && styles.swatchActive]} accessibilityLabel={`Colour ${c}`} />
                  ))}
                </View>

                <Text style={styles.label}>Role</Text>
                {ROLES.map(r => (
                  <TouchableOpacity key={r.key} style={[styles.roleRow, editor.role === r.key && styles.roleRowActive]} onPress={() => updateEditor({ role: r.key })}>
                    <Text style={[styles.roleName, editor.role === r.key && { color: Colors.blue }]}>{r.label}</Text>
                    <Text style={styles.roleSub}>{r.sub}</Text>
                  </TouchableOpacity>
                ))}

                <Text style={styles.label}>{editor.mode === 'add' ? 'PIN (4 digits)' : 'New PIN (leave blank to keep)'}</Text>
                <TextInput
                  style={[styles.input, { width: 140 }]}
                  value={editor.pin}
                  onChangeText={v => updateEditor({ pin: v.replace(/\D/g, '').slice(0, 4) })}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  placeholder="••••"
                  placeholderTextColor={Colors.textTertiary}
                />

                {!!error && <Text style={styles.error}>{error}</Text>}

                <TouchableOpacity style={[styles.primaryBtn, saving && { opacity: 0.6 }]} onPress={saveEditor} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{editor.mode === 'add' ? 'Add member' : 'Save changes'}</Text>}
                </TouchableOpacity>

                {editor.mode === 'edit' && editor.id !== me?.id && (
                  <TouchableOpacity style={styles.removeBtn} onPress={() => confirmRemove(editor)}>
                    <Text style={styles.removeText}>Remove from team</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: Colors.borderLight, marginBottom: 8 },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  sectionSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  chevron: { fontSize: 11, color: Colors.textTertiary },
  panel: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: Colors.borderLight, marginBottom: 12, marginTop: -4, gap: 8 },
  hint: { fontSize: 13, color: Colors.textSecondary },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 12, fontWeight: '600' },
  memberName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  memberRole: { fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
  editLink: { fontSize: 13, color: Colors.blue },
  notice: { fontSize: 13, color: Colors.green },
  error: { fontSize: 13, color: '#A32D2D', marginTop: 8 },
  secondaryBtn: { borderRadius: 10, borderWidth: 0.5, borderColor: Colors.borderLight, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  secondaryBtnText: { fontSize: 14, color: Colors.textSecondary },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  addBtn: { borderWidth: 1, borderColor: '#c0cfe0', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { fontSize: 14, color: Colors.blue },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: 640 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  cancelText: { fontSize: 14, color: Colors.textSecondary, padding: 4 },
  label: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.borderLight, padding: 12, fontSize: 15, color: Colors.textPrimary },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  swatchActive: { borderWidth: 3, borderColor: Colors.textPrimary },
  roleRow: { borderRadius: 10, borderWidth: 0.5, borderColor: Colors.borderLight, padding: 12, marginBottom: 6 },
  roleRowActive: { borderColor: Colors.blue, backgroundColor: '#E6F1FB' },
  roleName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  roleSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  primaryBtn: { backgroundColor: Colors.blue, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  primaryBtnSmall: { backgroundColor: Colors.blue, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  removeBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  removeText: { fontSize: 14, color: '#A32D2D' },
});
