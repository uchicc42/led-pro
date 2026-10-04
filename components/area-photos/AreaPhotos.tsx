import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { AreaPhoto, useAreaPhotos } from './useAreaPhotos';

// Native photo strip for an area. The web version lives in AreaPhotos.web.tsx.

export default function AreaPhotos({ areaId, jobId }: { areaId?: string; jobId?: string }) {
  const { photos, uploading, error, takePhoto, choosePhoto, deletePhoto } = useAreaPhotos(areaId, jobId);
  const [viewing, setViewing] = useState<AreaPhoto | null>(null);

  function confirmDelete(photo: AreaPhoto) {
    Alert.alert('Delete photo', 'Remove this photo from the area?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deletePhoto(photo); setViewing(null); } },
    ]);
  }

  return (
    <View style={styles.block}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Photos</Text>
        {photos.length > 0 && <Text style={styles.count}>{photos.length}</Text>}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.primaryBtn, uploading && { opacity: 0.6 }]} onPress={takePhoto} disabled={uploading}>
          <Text style={styles.primaryBtnText}>📷 Take photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryBtn, uploading && { opacity: 0.6 }]} onPress={choosePhoto} disabled={uploading}>
          <Text style={styles.secondaryBtnText}>🖼 From library</Text>
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={styles.uploadingRow}>
          <ActivityIndicator size="small" color={Colors.blue} />
          <Text style={styles.uploadingText}>Uploading…</Text>
        </View>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {photos.map(p => (
            <TouchableOpacity key={p.id} onPress={() => setViewing(p)} accessibilityLabel="View photo">
              <Image source={{ uri: p.url }} style={styles.thumb} contentFit="cover" transition={150} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        !uploading && <Text style={styles.empty}>No photos yet for this area.</Text>
      )}

      <Modal visible={!!viewing} animationType="fade" onRequestClose={() => setViewing(null)}>
        <SafeAreaView style={styles.viewer}>
          <View style={styles.viewerBar}>
            <TouchableOpacity onPress={() => setViewing(null)} style={styles.viewerBtn}>
              <Text style={styles.viewerBtnText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => viewing && confirmDelete(viewing)} style={styles.viewerBtn}>
              <Text style={[styles.viewerBtnText, { color: '#FF8A80' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
          {viewing && (
            <>
              <Image source={{ uri: viewing.url }} style={styles.viewerImage} contentFit="contain" />
              <Text style={styles.viewerMeta}>
                {viewing.taken_by_name ? `${viewing.taken_by_name} · ` : ''}
                {new Date(viewing.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </Text>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: Colors.borderLight, padding: 14, marginBottom: 10, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1 },
  count: { fontSize: 11, color: Colors.blue, backgroundColor: '#E6F1FB', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  buttonRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: { flex: 1, backgroundColor: Colors.blue, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  secondaryBtn: { flex: 1, backgroundColor: Colors.bgSecondary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.borderLight },
  secondaryBtnText: { color: Colors.textSecondary, fontSize: 14 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadingText: { fontSize: 12, color: Colors.textSecondary },
  error: { fontSize: 12, color: '#A32D2D' },
  strip: { gap: 8 },
  thumb: { width: 96, height: 96, borderRadius: 8, backgroundColor: Colors.bgSecondary },
  empty: { fontSize: 12, color: Colors.textTertiary },
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  viewerBtn: { padding: 8 },
  viewerBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  viewerImage: { flex: 1 },
  viewerMeta: { color: '#bbb', fontSize: 12, textAlign: 'center', padding: 12 },
});
