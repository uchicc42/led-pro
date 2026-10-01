import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';

export function useScopeExport() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [job, setJob] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const { totalOld, totalNew } = getTotals(areas);

  return { jobId, job, areas, loading, totalOld, totalNew };
}

export function getTotals(areas: any[]) {
  let totalOld = 0, totalNew = 0;
  areas.forEach(area => {
    (area.light_rows || []).forEach((row: any) => {
      if (!row.new_addition) totalOld += row.quantity || 0;
      if (!row.removed_only) totalNew += row.new_quantity || 0;
    });
  });
  return { totalOld, totalNew };
}

// Printable scope-of-work document, shared by the web print flow and native expo-print.
export function generateHTML(job: any, areas: any[]) {
  const { totalOld, totalNew } = getTotals(areas);
  const date = job?.date ? new Date(job.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

  const areaRows = areas.map((area: any) => {
    const rows = area.light_rows || [];
    if (rows.length === 0) return '';

    return rows.map((row: any, i: number) => `
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
