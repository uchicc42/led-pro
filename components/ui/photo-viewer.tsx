import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Full-screen photo viewer. A Modal is its own window, so safe-area padding isn't applied
// inside it automatically; the insets are read here (in the app's tree, where they're
// reliable) and applied by hand so the buttons sit below the clock/battery and above the
// home indicator.
//
// With `onSaveNote`, the viewer also shows an editable note for the photo.
export function PhotoViewer({ uri, cacheKey, meta, onClose, onDelete, note, onSaveNote, focusNote = false }: {
  uri: string | null;
  /** Stable id for the image cache (the photo's storage path), so a new link reuses the cached image. */
  cacheKey?: string;
  meta?: string;
  onClose: () => void;
  onDelete?: () => void;
  note?: string | null;
  onSaveNote?: (note: string) => void;
  /** Open with the note box focused (e.g. straight after taking a photo). */
  focusNote?: boolean;
}) {
  const insets = useSafeAreaInsets();
  // The note box is keyed by photo (below), so its draft starts fresh for each photo.
  const [pendingNote, setPendingNote] = useState<string | null>(null);

  function close() {
    // Closing keeps a typed note rather than silently throwing it away.
    if (onSaveNote && pendingNote !== null && pendingNote.trim() !== (note ?? '').trim()) onSaveNote(pendingNote.trim());
    setPendingNote(null);
    onClose();
  }

  return (
    <Modal
      visible={!!uri}
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.viewer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.bar}>
            <TouchableOpacity onPress={close} style={styles.btn} hitSlop={8} accessibilityLabel="Close photo">
              <Text style={styles.btnText}>✕ Close</Text>
            </TouchableOpacity>
            {onDelete && (
              <TouchableOpacity onPress={onDelete} style={[styles.btn, styles.deleteBtn]} hitSlop={8} accessibilityLabel="Delete photo">
                <Text style={[styles.btnText, { color: '#FF8A80' }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
          {uri && <Image source={{ uri, cacheKey }} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />}
          {!!meta && <Text style={styles.meta}>{meta}</Text>}

          {onSaveNote && uri && (
            <NoteBox key={uri} note={note ?? ''} focus={focusNote} onDraft={setPendingNote} onSave={onSaveNote} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function NoteBox({ note, focus, onDraft, onSave }: {
  note: string;
  focus: boolean;
  onDraft: (draft: string) => void;
  onSave: (note: string) => void;
}) {
  const [draft, setDraft] = useState(note);
  const changed = draft.trim() !== note.trim();
  return (
    <View style={styles.noteRow}>
      <TextInput
        style={styles.noteInput}
        value={draft}
        onChangeText={v => { setDraft(v); onDraft(v); }}
        placeholder="Add a note…"
        placeholderTextColor="#888"
        multiline
        autoFocus={focus}
      />
      {changed && (
        <TouchableOpacity style={styles.saveBtn} onPress={() => { onSave(draft.trim()); onDraft(draft.trim()); }}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: '#000' },
  bar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  btn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  deleteBtn: { backgroundColor: 'rgba(255,138,128,0.16)' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  image: { flex: 1 },
  meta: { color: '#bbb', fontSize: 12, textAlign: 'center', paddingTop: 12 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  noteInput: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#fff', backgroundColor: 'rgba(255,255,255,0.12)' },
  saveBtn: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center', backgroundColor: '#185FA5' },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
