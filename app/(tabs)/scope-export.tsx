import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../supabase';

export default function ScopeExportScreen() {
  const { jobId } = useLocalSearchParams();
  const [job, setJob] = useState(null);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadAll();
  }, [jobId]);

  async function loadAll() {
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (jobData) setJob(jobData);

    const { data: areaData } = await supabase
      .from('areas')
      .select(`*, light_rows(*)`)
      .eq('job_id', jobId)
      .order('created_at');
    if (areaData) setAreas(areaData);
    setLoading(false);
  }

  function getTotals() {
    let totalOld = 0, totalNew = 0, totalSensors = 0;
    areas.forEach(area => {
      (area.light_rows || []).forEach(row => {
        if (!row.new_addition) totalOld += row.quantity || 0;
        if (!row.removed_only) totalNew += row.new_quantity || 0;
      });
    });
    return { totalOld, totalNew };
  }

  function generateHTML() {
    const { totalOld, totalNew } = getTotals();
    const date = job?.date ? new Date(job.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

    const areaRows = areas.map(area => {
      const rows = area.light_rows || [];
      if (rows.length === 0) return '';

      return rows.map((row, i) => `
        <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
          ${i === 0 ? `<td class="area-cell" rowspan="${rows.length}">${area.name}</td>` : ''}
          <td class="qty">${row.new_addition ? '—' : row.quantity || 0}</td>
          <td>${row.new_addition ? '(new addition)' : row.light_type_id || '—'}</td>
          <td class="qty">${row.removed_only ? '—' : row.new_quantity || 0}</td>
          <td>${row.removed_only ? '(removed only)' : row.new_light_type || '—'}</td>
          <td class="center">${row.lumen_setting || '—'}</td>
          <td class="center">${row.hours_flagged ? `${row.hours_start || ''} – ${row.hours_end || ''}` : '—'}</td>
          <td class="note">${row.removed_only ? '🗑 Remove only' : row.new_addition ? '➕ New addition' : ''}</td>
        </tr>
      `).join('');
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Scope of Work — ${job?.name || ''}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #222; padding: 24px; }
          .header { margin-bottom: 20px; }
          .company { font-size: 18px; font-weight: bold; color: #185FA5; margin-bottom: 4px; }
          .job-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 2px; }
          .job-meta { font-size: 11px; color: #666; }
          .divider { border: none; border-top: 2px solid #185FA5; margin: 12px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #185FA5; color: white; padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
          th.center { text-align: center; }
          td { padding: 6px 8px; border-bottom: 0.5px solid #e0e7ef; vertical-align: top; }
          td.qty { text-align: center; font-weight: 500; width: 50px; }
          td.center { text-align: center; }
          td.area-cell { font-weight: 600; color: #185FA5; background: #f4f7fb; border-right: 2px solid #185FA5; }
          td.note { color: #854F0B; font-size: 10px; }
          tr.even { background: #f9fbff; }
          tr.odd { background: #ffffff; }
          .totals { display: flex; gap: 24px; margin-bottom: 20px; }
          .total-card { background: #f4f7fb; border: 1px solid #e0e7ef; border-radius: 8px; padding: 10px 16px; }
          .total-val { font-size: 22px; font-weight: bold; color: #185FA5; }
          .total-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
          .footer { margin-top: 24px; font-size: 10px; color: #aaa; border-top: 1px solid #e0e7ef; padding-top: 10px; }
          .section-note { font-size: 10px; color: #666; margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">LED Pro — Scope of Work</div>
          <div class="job-title">${job?.name || 'Untitled Job'}</div>
          <div class="job-meta">${job?.location || ''} &nbsp;|&nbsp; ${date} &nbsp;|&nbsp; Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <hr class="divider">

        <div class="totals">
          <div class="total-card">
            <div class="total-val">${totalOld}</div>
            <div class="total-label">Total current fixtures</div>
          </div>
          <div class="total-card">
            <div class="total-val">${totalNew}</div>
            <div class="total-label">Total new fixtures</div>
          </div>
          <div class="total-card">
            <div class="total-val">${areas.length}</div>
            <div class="total-label">Areas covered</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th class="center">Old qty</th>
              <th>Current light type</th>
              <th class="center">New qty</th>
              <th>New light type</th>
              <th class="center">Lumen</th>
              <th class="center">Hours</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${areaRows}
          </tbody>
        </table>

        <div class="footer">
          LED Pro · Commercial lighting management · Generated automatically from field count data
        </div>
      </body>
      </html>
    `;
  }

  async function exportPDF() {
    setGenerating(true);
    const html = generateHTML();

    if (Platform.OS === 'web') {
      // Web: open in new tab and trigger print
      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 500);
    } else {
      // Mobile: use expo-print
      try {
        const Print = await import('expo-print');
        const Sharing = await import('expo-sharing');
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } catch (e) {
        console.log('Print error:', e);
      }
    }
    setGenerating(false);
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  const { totalOld, totalNew } = getTotals();

  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.page}>
        <div style={webStyles.container}>
          <div style={webStyles.header}>
            <button style={webStyles.backBtn} onClick={() => router.push(`/area-list?jobId=${jobId}`)}>
              ← Back
            </button>
            <div style={webStyles.headerTitle}>Scope of Work Preview</div>
          </div>

          {/* Summary cards */}
          <div style={webStyles.statRow}>
            <div style={webStyles.statCard}>
              <div style={webStyles.statVal}>{totalOld}</div>
              <div style={webStyles.statLabel}>Current fixtures</div>
            </div>
            <div style={webStyles.statCard}>
              <div style={webStyles.statVal}>{totalNew}</div>
              <div style={webStyles.statLabel}>New fixtures</div>
            </div>
            <div style={webStyles.statCard}>
              <div style={webStyles.statVal}>{areas.length}</div>
              <div style={webStyles.statLabel}>Areas</div>
            </div>
          </div>

          {/* Preview table */}
          <div style={webStyles.card}>
            <div style={webStyles.jobTitle}>{job?.name}</div>
            <div style={webStyles.jobMeta}>{job?.location} · {job?.date && new Date(job.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>

            <table style={webStyles.table}>
              <thead>
                <tr>
                  {['Area', 'Old qty', 'Current type', 'New qty', 'New type', 'Lumen', 'Hours', 'Notes'].map(h => (
                    <th key={h} style={webStyles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {areas.map(area => {
                  const rows = area.light_rows || [];
                  if (rows.length === 0) return null;
                  return rows.map((row, i) => (
                    <tr key={`${area.id}-${i}`} style={{ background: i % 2 === 0 ? '#f9fbff' : '#fff' }}>
                      {i === 0 && (
                        <td rowSpan={rows.length} style={webStyles.tdArea}>{area.name}</td>
                      )}
                      <td style={webStyles.tdQty}>{row.new_addition ? '—' : row.quantity || 0}</td>
                      <td style={webStyles.td}>{row.new_addition ? '(new addition)' : row.light_type_id || '—'}</td>
                      <td style={webStyles.tdQty}>{row.removed_only ? '—' : row.new_quantity || 0}</td>
                      <td style={webStyles.td}>{row.removed_only ? '(removed only)' : row.new_light_type || '—'}</td>
                      <td style={webStyles.tdCenter}>{row.lumen_setting || '—'}</td>
                      <td style={webStyles.tdCenter}>{row.hours_flagged ? `${row.hours_start || ''} – ${row.hours_end || ''}` : '—'}</td>
                      <td style={{ ...webStyles.td, fontSize: 11, color: '#854F0B' }}>
                        {row.removed_only ? '🗑 Remove only' : row.new_addition ? '➕ New addition' : ''}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

          {/* Export button */}
          <button
            style={{ ...webStyles.exportBtn, opacity: generating ? 0.6 : 1 }}
            onClick={exportPDF}
            disabled={generating}
          >
            {generating ? 'Generating...' : '⬇ Export / Print PDF'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(`/area-list?jobId=${jobId}`)}>
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

        <View style={styles.jobCard}>
          <Text style={styles.jobTitle}>{job?.name}</Text>
          <Text style={styles.jobMeta}>{job?.location}</Text>
        </View>

        {areas.map(area => {
          const rows = area.light_rows || [];
          if (rows.length === 0) return null;
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
                  {row.lumen_setting && <Text style={styles.lightRowMeta}>Lumen: {row.lumen_setting}</Text>}
                </View>
              ))}
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

const webStyles = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 1000, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary },
  headerTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 12, padding: '16px 20px', border: '0.5px solid #e0e7ef' },
  statVal: { fontSize: 28, fontWeight: '600', color: Colors.blue, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.textTertiary },
  card: { background: '#fff', borderRadius: 14, padding: '24px', border: '0.5px solid #e0e7ef', marginBottom: 20, overflowX: 'auto' },
  jobTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  jobMeta: { fontSize: 13, color: Colors.textTertiary, marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { background: '#185FA5', color: '#fff', padding: '8px 10px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '7px 10px', borderBottom: '0.5px solid #e0e7ef', verticalAlign: 'top' },
  tdQty: { padding: '7px 10px', borderBottom: '0.5px solid #e0e7ef', textAlign: 'center', fontWeight: '500', width: 60 },
  tdCenter: { padding: '7px 10px', borderBottom: '0.5px solid #e0e7ef', textAlign: 'center' },
  tdArea: { padding: '7px 10px', borderBottom: '0.5px solid #e0e7ef', fontWeight: '600', color: '#185FA5', background: '#f4f7fb', borderRight: '2px solid #185FA5', verticalAlign: 'top' },
  exportBtn: { width: '100%', padding: '14px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: '500', cursor: 'pointer' },
};

const styles = StyleSheet.create({
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