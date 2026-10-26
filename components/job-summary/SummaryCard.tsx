import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { FixtureTotal, NO_SUPPLIER, grandTotal, hasSuppliers, supplierGroups } from './summary';

// Native UI. The web UI lives in SummaryCard.web.tsx; Metro picks the right file per platform.

export default function SummaryCard({ job, totals }: { job: any; totals: FixtureTotal[] }) {
  const notes = (job?.installer_notes || '').trim();
  const groups = supplierGroups(totals);
  const grouped = hasSuppliers(groups);
  return (
    <View style={styles.card}>
      {!!job?.company_name && <Text style={styles.company}>{job.company_name}</Text>}
      <Text style={styles.project}>{job?.name}</Text>
      <Text style={styles.meta}>{job?.location}</Text>

      <Text style={styles.heading}>Fixture summary</Text>
      <View style={styles.headRow}>
        <Text style={[styles.headText, { flex: 1 }]}>Fixture type</Text>
        <Text style={styles.headText}>Totals</Text>
      </View>
      {totals.length === 0 ? (
        <Text style={styles.empty}>No new lights entered yet</Text>
      ) : (
        <>
          {grouped ? groups.map(g => (
            <View key={g.supplier ?? ''}>
              <View style={[styles.row, styles.supplierRow]}>
                <Text style={styles.supplier}>{g.supplier ?? NO_SUPPLIER}</Text>
              </View>
              {g.items.map(t => (
                <View key={t.name} style={styles.row}>
                  <Text style={[styles.name, styles.indented]}>{t.name}</Text>
                  <Text style={styles.total}>{t.total}</Text>
                </View>
              ))}
              <View style={styles.row}>
                <Text style={[styles.name, styles.indented, styles.subtotal]}>Subtotal</Text>
                <Text style={[styles.total, styles.subtotal]}>{g.subtotal}</Text>
              </View>
            </View>
          )) : totals.map((t, i) => (
            <View key={t.name} style={[styles.row, i % 2 === 1 && styles.rowShaded]}>
              <Text style={styles.name}>{t.name}</Text>
              <Text style={styles.total}>{t.total}</Text>
            </View>
          ))}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={[styles.name, styles.bold]}>Total</Text>
            <Text style={[styles.total, styles.bold]}>{grandTotal(totals)}</Text>
          </View>
        </>
      )}

      {!!notes && (
        <>
          <Text style={styles.heading}>Installer notes</Text>
          <Text style={styles.notes}>{notes}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: Colors.borderLight, marginBottom: 16 },
  company: { fontSize: 17, fontWeight: '700', color: Colors.blue, marginBottom: 2 },
  project: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  meta: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  heading: { fontSize: 11, fontWeight: '600', color: Colors.blue, textTransform: 'uppercase', letterSpacing: 1, marginTop: 18, marginBottom: 6 },
  headRow: { flexDirection: 'row', backgroundColor: Colors.blue, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  headText: { fontSize: 11, fontWeight: '600', color: '#fff', textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  rowShaded: { backgroundColor: Colors.bgSecondary },
  totalRow: { borderTopWidth: 2, borderTopColor: Colors.blue, borderBottomWidth: 0 },
  name: { flex: 1, fontSize: 13, color: Colors.textPrimary, paddingRight: 10 },
  total: { fontSize: 13, color: Colors.textPrimary, minWidth: 40, textAlign: 'right' },
  bold: { fontWeight: '700' },
  supplierRow: { backgroundColor: '#EAF2FB', borderBottomWidth: 0 },
  supplier: { fontSize: 13, fontWeight: '700', color: Colors.blue },
  indented: { paddingLeft: 12 },
  subtotal: { fontStyle: 'italic', color: Colors.textSecondary },
  empty: { fontSize: 13, color: Colors.textTertiary, padding: 10 },
  notes: { fontSize: 13, color: Colors.textPrimary, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 8, padding: 10 },
});
