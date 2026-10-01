import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { areaControlsText, generateHTML, rowControlsText, sortedRows, useScopeExport } from './useScopeExport';

// Native UI. The web UI lives in ScopeExportScreen.web.tsx; Metro picks the right file per platform.

export default function ScopeExportScreen() {
  const { jobId, job, areas, loading, kinds, totalOld, totalNew, totalSensors, totalPhotocells } = useScopeExport();
  const [generating, setGenerating] = useState(false);

  async function exportPDF() {
    setGenerating(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: generateHTML(job, areas) });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      console.log('Print error:', e);
    }
    setGenerating(false);
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(`/area-list?jobId=${jobId}` as any)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scope of Work</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{totalOld}</Text>
            <Text style={styles.statLabel}>Current</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{totalNew}</Text>
            <Text style={styles.statLabel}>New</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{areas.length}</Text>
            <Text style={styles.statLabel}>Areas</Text>
          </View>
        </View>

        {kinds.length > 0 && (
          <View style={styles.statRow}>
            {kinds.includes('occupancy') && (
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{totalSensors}</Text>
                <Text style={styles.statLabel}>Sensors</Text>
              </View>
            )}
            {kinds.includes('photocell') && (
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{totalPhotocells}</Text>
                <Text style={styles.statLabel}>Photocells</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.jobCard}>
          <Text style={styles.jobTitle}>{job?.name}</Text>
          <Text style={styles.jobMeta}>{job?.location}</Text>
        </View>

        {areas.map(area => {
          const rows = sortedRows(area);
          const areaWide = areaControlsText(area, kinds);
          if (rows.length === 0 && !areaWide) return null;
          return (
            <View key={area.id} style={styles.areaBlock}>
              <Text style={styles.areaName}>{area.name}</Text>
              {rows.map((row, i) => (
                <View key={i} style={styles.lightRow}>
                  <Text style={styles.lightRowText}>
                    {row.new_addition
                      ? `➕ Add: ${row.new_quantity} × ${row.new_light_type || '?'}`
                      : row.removed_only
                      ? `🗑 Remove: ${row.quantity} × ${row.light_type_id || '?'}`
                      : `${row.quantity} × ${row.light_type_id || '?'} → ${row.new_quantity} × ${row.new_light_type || '?'}`
                    }
                  </Text>
                  {!!row.lumen_setting && <Text style={styles.lightRowMeta}>Lumen: {row.lumen_setting}</Text>}
                  {!!rowControlsText(area, row.id, kinds) && (
                    <Text style={styles.lightRowMeta}>{rowControlsText(area, row.id, kinds)}</Text>
                  )}
                </View>
              ))}
              {!!areaWide && <Text style={styles.areaWide}>Area-wide: {areaWide}</Text>}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.exportBtn, generating && { opacity: 0.6 }]}
          onPress={exportPDF}
          disabled={generating}
        >
          {generating
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.exportBtnText}>⬇ Export / Share PDF</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  areaWide: { fontSize: 12, color: '#085041', backgroundColor: '#EEF6F1', borderRadius: 6, padding: 8, marginTop: 8 },
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { padding: 20, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { fontSize: 14, color: Colors.blue },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: Colors.borderLight, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '600', color: Colors.blue },
  statLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  jobCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: Colors.borderLight, marginBottom: 16 },
  jobTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  jobMeta: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  areaBlock: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: Colors.borderLight, marginBottom: 10 },
  areaName: { fontSize: 14, fontWeight: '600', color: Colors.blue, marginBottom: 8 },
  lightRow: { paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  lightRowText: { fontSize: 13, color: Colors.textPrimary },
  lightRowMeta: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  exportBtn: { backgroundColor: Colors.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  exportBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
