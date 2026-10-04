import { deleteRow } from './data';
import { getSnapshot, putRow } from './store';

// Deleting a record also removes what hangs off it, on the device and (via the queue) on
// the server. Children are deleted first, so the server never sees an orphaned reference.
// Issues keep existing but lose the link, matching the server's "on delete set null".

export function deleteLightRowCascade(lightRowId: string) {
  const s = getSnapshot();
  s.where('install_rows', r => r.light_row_id === lightRowId).forEach(r => deleteRow('install_rows', r.id));
  s.where('area_controls', c => c.light_row_id === lightRowId).forEach(c => deleteRow('area_controls', c.id));
  s.where('job_issues', i => i.light_row_id === lightRowId).forEach(i => putRow('job_issues', { ...i, light_row_id: null }));
  deleteRow('light_rows', lightRowId);
}

export function deleteAreaCascade(areaId: string) {
  const s = getSnapshot();
  s.where('light_rows', r => r.area_id === areaId).forEach(r => deleteLightRowCascade(r.id));
  s.where('area_controls', c => c.area_id === areaId).forEach(c => deleteRow('area_controls', c.id));
  s.where('area_photos', p => p.area_id === areaId).forEach(p => deleteRow('area_photos', p.id));
  s.where('job_issues', i => i.area_id === areaId).forEach(i => putRow('job_issues', { ...i, area_id: null }));
  deleteRow('areas', areaId);
}
