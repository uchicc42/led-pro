import { Fragment, type CSSProperties } from 'react';
import { Colors } from '../../constants/Colors';
import { FixtureTotal, NO_SUPPLIER, grandTotal, hasSuppliers, supplierGroups } from './summary';

// Web-only UI built with DOM elements. Metro only bundles this file for web; native uses SummaryCard.tsx.

export default function SummaryCard({ job, totals }: { job: any; totals: FixtureTotal[] }) {
  const notes = (job?.installer_notes || '').trim();
  const groups = supplierGroups(totals);
  const grouped = hasSuppliers(groups);
  return (
    <div style={webStyles.card}>
      {!!job?.company_name && <div style={webStyles.company}>{job.company_name}</div>}
      <div style={webStyles.project}>{job?.name}</div>
      <div style={webStyles.meta}>{job?.location}</div>

      <div style={webStyles.heading}>Fixture summary</div>
      <table style={webStyles.table}>
        <thead>
          <tr>
            <th style={webStyles.th}>Fixture type</th>
            <th style={{ ...webStyles.th, ...webStyles.num }}>Totals</th>
          </tr>
        </thead>
        <tbody>
          {totals.length === 0 ? (
            <tr><td style={{ ...webStyles.td, color: Colors.textTertiary }} colSpan={2}>No new lights entered yet</td></tr>
          ) : (
            <>
              {grouped ? groups.map(g => (
                <Fragment key={g.supplier ?? ''}>
                  <tr style={{ background: '#EAF2FB' }}>
                    <td style={{ ...webStyles.td, ...webStyles.supplier }} colSpan={2}>{g.supplier ?? NO_SUPPLIER}</td>
                  </tr>
                  {g.items.map(t => (
                    <tr key={t.name}>
                      <td style={{ ...webStyles.td, paddingLeft: 26 }}>{t.name}</td>
                      <td style={{ ...webStyles.td, ...webStyles.num }}>{t.total}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...webStyles.td, ...webStyles.subtotal, paddingLeft: 26 }}>Subtotal</td>
                    <td style={{ ...webStyles.td, ...webStyles.num, ...webStyles.subtotal }}>{g.subtotal}</td>
                  </tr>
                </Fragment>
              )) : totals.map((t, i) => (
                <tr key={t.name} style={{ background: i % 2 === 1 ? Colors.bgSecondary : '#fff' }}>
                  <td style={webStyles.td}>{t.name}</td>
                  <td style={{ ...webStyles.td, ...webStyles.num }}>{t.total}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...webStyles.td, ...webStyles.totalCell }}>Total</td>
                <td style={{ ...webStyles.td, ...webStyles.num, ...webStyles.totalCell }}>{grandTotal(totals)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {!!notes && (
        <>
          <div style={webStyles.heading}>Installer notes</div>
          <div style={webStyles.notes}>{notes}</div>
        </>
      )}
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
  card: { background: '#fff', borderRadius: 12, padding: 20, border: '0.5px solid #e0e7ef', marginBottom: 16 },
  company: { fontSize: 20, fontWeight: 700, color: Colors.blue, marginBottom: 4 },
  project: { fontSize: 16, fontWeight: 600, color: Colors.textPrimary },
  meta: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  heading: { fontSize: 11, fontWeight: 600, color: Colors.blue, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 20, marginBottom: 6 },
  table: { width: '100%', maxWidth: 560, borderCollapse: 'collapse' },
  th: { background: Colors.blue, color: '#fff', padding: '7px 10px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '7px 10px', fontSize: 13, color: Colors.textPrimary, borderBottom: '0.5px solid #e0e7ef' },
  num: { textAlign: 'right', width: 90 },
  supplier: { fontWeight: 700, color: Colors.blue, borderBottom: 'none' },
  subtotal: { fontStyle: 'italic', color: Colors.textSecondary },
  totalCell: { fontWeight: 700, borderTop: `2px solid ${Colors.blue}`, borderBottom: 'none' },
  notes: { fontSize: 13, color: Colors.textPrimary, whiteSpace: 'pre-wrap', border: '0.5px solid #e0e7ef', borderRadius: 8, padding: 12, maxWidth: 560 },
};
