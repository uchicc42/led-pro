import { router, useLocalSearchParams } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';

// Native UI: the drawing canvas is web-only (LayoutCanvasScreen.web.tsx); mobile shows area reference info.

export default function LayoutCanvasScreen() {
  const { areaId, jobId, areaName } = useLocalSearchParams<{ areaId: string; jobId: string; areaName: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push(`/area-entry?areaId=${areaId}&jobId=${jobId}` as any)}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {areaName} — layout
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🗺</Text>
          <Text style={styles.infoTitle}>Ceiling layout</Text>
          <Text style={styles.infoText}>
            The full layout canvas is available on the browser version of LED Pro for drawing and editing ceiling diagrams.
          </Text>
          <Text style={styles.infoText}>
            On mobile, use this screen to view job notes and reference the area details while on site.
          </Text>
        </View>

        <View style={styles.refCard}>
          <Text style={styles.refLabel}>Area</Text>
          <Text style={styles.refValue}>{areaName}</Text>
        </View>

        <TouchableOpacity
          style={styles.openBrowserBtn}
          onPress={() => router.push(`/area-entry?areaId=${areaId}&jobId=${jobId}` as any)}
        >
          <Text style={styles.openBrowserBtnText}>← Back to area entry</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { fontSize: 14, color: Colors.blue },
  headerTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 80 },
  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.borderLight, marginBottom: 16 },
  infoIcon: { fontSize: 40, marginBottom: 12 },
  infoTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 10 },
  infoText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  refCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: Colors.borderLight, marginBottom: 16 },
  refLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  refValue: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  openBrowserBtn: { backgroundColor: Colors.blue, borderRadius: 12, padding: 16, alignItems: 'center' },
  openBrowserBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
