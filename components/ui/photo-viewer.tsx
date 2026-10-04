import { Image } from 'expo-image';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Full-screen photo viewer. A Modal is its own window, so safe-area padding isn't applied
// inside it automatically; the insets are read here (in the app's tree, where they're
// reliable) and applied by hand so the buttons sit below the clock/battery and above the
// home indicator.
export function PhotoViewer({ uri, meta, onClose, onDelete }: {
  uri: string | null;
  meta?: string;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={!!uri}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.viewer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.bar}>
          <TouchableOpacity onPress={onClose} style={styles.btn} hitSlop={8} accessibilityLabel="Close photo">
            <Text style={styles.btnText}>✕ Close</Text>
          </TouchableOpacity>
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={[styles.btn, styles.deleteBtn]} hitSlop={8} accessibilityLabel="Delete photo">
              <Text style={[styles.btnText, { color: '#FF8A80' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
        {uri && <Image source={{ uri }} style={styles.image} contentFit="contain" />}
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
      </View>
    </Modal>
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
});
