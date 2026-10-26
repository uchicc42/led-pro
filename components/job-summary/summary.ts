// Job summary: customer, project, site address, totals of each new light type (grouped by
// supplier) and installer notes. Shared by the summary screen and the scope of work (screens
// and PDFs).

export type FixtureTotal = { name: string; total: number; supplier: string | null };
export type SupplierGroup = { supplier: string | null; items: FixtureTotal[]; subtotal: number };

// One line per new light type across the whole job, all mounts combined. "Removed only" rows
// have no new light and are left out. Types follow the light type list order; types no longer
// in the list come last, in the order they first appear.
export function fixtureTotals(areas: any[], types: any[]): FixtureTotal[] {
  const sums = new Map<string, number>();
  areas.forEach(area => (area.light_rows || []).forEach((row: any) => {
    if (row.removed_only || !row.new_light_type) return;
    sums.set(row.new_light_type, (sums.get(row.new_light_type) ?? 0) + (row.new_quantity || 0));
  }));
  const supplierOf = new Map<string, string>();
  types.forEach(t => { if (t.supplier) supplierOf.set(t.name, t.supplier); });
  const position = new Map<string, number>();
  [...types]
    .filter(t => t.category === 'new')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .forEach((t, i) => position.set(t.name, i));
  const firstSeen = [...sums.keys()];
  const rank = (name: string) => position.get(name) ?? position.size + firstSeen.indexOf(name);
  return [...sums.entries()]
    .filter(([, total]) => total > 0)
    .map(([name, total]) => ({ name, total, supplier: supplierOf.get(name) ?? null }))
    .sort((a, b) => rank(a.name) - rank(b.name));
}

export function grandTotal(totals: FixtureTotal[]) {
  return totals.reduce((sum, t) => sum + t.total, 0);
}

// Totals grouped by supplier (alphabetical), with lights that have no supplier last. When no
// light has a supplier there is one group with supplier null, shown without group headings.
export function supplierGroups(totals: FixtureTotal[]): SupplierGroup[] {
  const groups = new Map<string | null, FixtureTotal[]>();
  totals.forEach(t => groups.set(t.supplier, [...(groups.get(t.supplier) ?? []), t]));
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a.localeCompare(b)))
    .map(([supplier, items]) => ({ supplier, items, subtotal: grandTotal(items) }));
}

export const hasSuppliers = (groups: SupplierGroup[]) => groups.some(g => g.supplier !== null);
export const NO_SUPPLIER = 'No supplier set';

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
  .sum-table tr.sum-supplier td { font-weight: bold; color: #185FA5; background: #EAF2FB; padding-top: 8px; }
  .sum-table td.sum-item { padding-left: 24px; }
  .sum-table tr.sum-subtotal td { font-style: italic; color: #555; background: #fff; }
  .sum-heading { font-size: 12px; font-weight: bold; color: #185FA5; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .sum-notes { font-size: 12px; color: #333; white-space: pre-wrap; border: 1px solid #e0e7ef; border-radius: 6px; padding: 10px 12px; margin-bottom: 20px; }
`;

// Fixture totals table plus installer notes (when there are any).
export function summaryBodyHTML(job: any, totals: FixtureTotal[]) {
  const groups = supplierGroups(totals);
  const grouped = hasSuppliers(groups);
  const item = (t: FixtureTotal) =>
    `<tr><td${grouped ? ' class="sum-item"' : ''}>${escapeHtml(t.name)}</td><td class="num">${t.total}</td></tr>`;
  const body = grouped
    ? groups.map(g => `<tr class="sum-supplier"><td colspan="2">${escapeHtml(g.supplier ?? NO_SUPPLIER)}</td></tr>`
        + g.items.map(item).join('')
        + `<tr class="sum-subtotal"><td class="sum-item">Subtotal</td><td class="num">${g.subtotal}</td></tr>`).join('')
    : totals.map(item).join('');
  const rows = totals.length === 0
    ? '<tr><td colspan="2">No new lights entered yet</td></tr>'
    : body + `<tr class="sum-total"><td>Total</td><td class="num">${grandTotal(totals)}</td></tr>`;
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
