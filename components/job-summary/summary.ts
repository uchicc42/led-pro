// Job summary: customer, project, site address, totals of each new light type and installer
// notes. Shared by the summary screen and the scope of work (screens and PDFs).

export type FixtureTotal = { name: string; total: number };

// One line per new light type across the whole job, all mounts combined. "Removed only" rows
// have no new light and are left out. Types follow the light type list order; types no longer
// in the list come last, in the order they first appear.
export function fixtureTotals(areas: any[], types: any[]): FixtureTotal[] {
  const sums = new Map<string, number>();
  areas.forEach(area => (area.light_rows || []).forEach((row: any) => {
    if (row.removed_only || !row.new_light_type) return;
    sums.set(row.new_light_type, (sums.get(row.new_light_type) ?? 0) + (row.new_quantity || 0));
  }));
  const position = new Map<string, number>();
  [...types]
    .filter(t => t.category === 'new')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .forEach((t, i) => position.set(t.name, i));
  const firstSeen = [...sums.keys()];
  const rank = (name: string) => position.get(name) ?? position.size + firstSeen.indexOf(name);
  return [...sums.entries()]
    .filter(([, total]) => total > 0)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => rank(a.name) - rank(b.name));
}

export function grandTotal(totals: FixtureTotal[]) {
  return totals.reduce((sum, t) => sum + t.total, 0);
}

export function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const SUMMARY_CSS = `
  .sum-table { width: 100%; max-width: 520px; border-collapse: collapse; margin-bottom: 20px; }
  .sum-table th { background: #185FA5; color: white; padding: 7px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .sum-table th.num, .sum-table td.num { text-align: right; width: 90px; }
  .sum-table td { padding: 6px 10px; border-bottom: 0.5px solid #e0e7ef; font-size: 12px; }
  .sum-table tr:nth-child(even) td { background: #f4f7fb; }
  .sum-table tr.sum-total td { font-weight: bold; border-top: 2px solid #185FA5; background: #fff; }
  .sum-heading { font-size: 12px; font-weight: bold; color: #185FA5; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .sum-notes { font-size: 12px; color: #333; white-space: pre-wrap; border: 1px solid #e0e7ef; border-radius: 6px; padding: 10px 12px; margin-bottom: 20px; }
`;

// Fixture totals table plus installer notes (when there are any).
export function summaryBodyHTML(job: any, totals: FixtureTotal[]) {
  const rows = totals.length === 0
    ? '<tr><td colspan="2">No new lights entered yet</td></tr>'
    : totals.map(t => `<tr><td>${escapeHtml(t.name)}</td><td class="num">${t.total}</td></tr>`).join('')
      + `<tr class="sum-total"><td>Total</td><td class="num">${grandTotal(totals)}</td></tr>`;
  const notes = (job?.installer_notes || '').trim();
  return `
    <div class="sum-heading">Fixture summary</div>
    <table class="sum-table">
      <thead><tr><th>Fixture type</th><th class="num">Totals</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${notes ? `<div class="sum-heading">Installer notes</div><div class="sum-notes">${escapeHtml(notes)}</div>` : ''}
  `;
}

// The stand-alone one-page summary PDF.
export function generateSummaryHTML(job: any, totals: FixtureTotal[]) {
  const date = job?.date ? new Date(job.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Job Summary — ${escapeHtml(job?.name || '')}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #222; padding: 32px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .title { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
        .company { font-size: 20px; font-weight: bold; color: #185FA5; margin-bottom: 4px; }
        .project { font-size: 15px; font-weight: bold; color: #333; margin-bottom: 2px; }
        .meta { font-size: 12px; color: #666; }
        .divider { border: none; border-top: 2px solid #185FA5; margin: 14px 0 18px; }
        ${SUMMARY_CSS}
      </style>
    </head>
    <body>
      <div class="title">LED Pro — Job Summary</div>
      ${job?.company_name ? `<div class="company">${escapeHtml(job.company_name)}</div>` : ''}
      <div class="project">${escapeHtml(job?.name || 'Untitled Job')}</div>
      <div class="meta">${escapeHtml(job?.location || '')}${date ? ` &nbsp;|&nbsp; ${date}` : ''}</div>
      <hr class="divider">
      ${summaryBodyHTML(job, totals)}
    </body>
    </html>
  `;
}
