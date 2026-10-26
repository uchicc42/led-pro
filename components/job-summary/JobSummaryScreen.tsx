import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { NotOnDevice } from '../ui/not-on-device';
import SummaryCard from './SummaryCard';
import { generateSummaryHTML } from './summary';
import { useJobSummary } from './useJobSummary';

// Native UI. The web UI lives in JobSummaryScreen.web.tsx; Metro picks the right file per platform.

export default function JobSummaryScreen() {
  const { job, totals, loading, notOnDevice, backHref } = useJobSummary();
  const [generating, setGenerating] = useState(false);

  async function exportPDF() {
    setGenerating(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: generateSummaryHTML(job, totals) });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'The PDF was created, but this device can\'t open the share menu.');
      } else {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: `Job Summary — ${job?.name ?? ''}` });
      }
    } catch (e) {
      console.log('Print error:', e);
      Alert.alert('Export failed', 'The summary PDF could not be created. Please try again.');
    }
    setGenerating(false);
  }

  if (notOnDevice) return <NotOnDevice backHref={backHref} />;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(backHref as any)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Summary</Text>
          <View style={{ width: 50 }} />
        </View>

        <SummaryCard job={job} totals={totals} />

        <TouchableOpacity style={[styles.exportBtn, generating && { opacity: 0.6 }]} onPress={exportPDF} disabled={generating}>
          {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.exportBtnText}>📄 Share summary PDF</Text>}
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
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  exportBtn: { backgroundColor: Colors.blue, borderRadius: 12, padding: 16, alignItems: 'center' },
  exportBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
