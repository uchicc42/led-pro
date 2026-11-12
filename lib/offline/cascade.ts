import { deleteRow } from './data';
import { deleteLocalPhoto } from './files';
import { getSnapshot, putRow, removeRow } from './store';

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
  // Rooms inside this area go with it (one level, so no deeper rooms).
  s.where('areas', a => a.parent_area_id === areaId && a.id !== areaId).forEach(room => deleteAreaCascade(room.id));
  s.where('light_rows', r => r.area_id === areaId).forEach(r => deleteLightRowCascade(r.id));
  s.where('area_controls', c => c.area_id === areaId).forEach(c => deleteRow('area_controls', c.id));
  s.where('area_photos', p => p.area_id === areaId).forEach(p => deleteRow('area_photos', p.id));
  s.where('job_issues', i => i.area_id === areaId).forEach(i => putRow('job_issues', { ...i, area_id: null }));
  deleteRow('areas', areaId);
}

/** Removes a job the server has already deleted from this device: its rows and any photo files kept here. */
export function forgetJob(jobId: string) {
  const s = getSnapshot();
  const areaIds = new Set(s.where('areas', a => a.job_id === jobId).map(a => a.id));
  const rowIds = new Set(s.where('light_rows', r => areaIds.has(r.area_id)).map(r => r.id));
  s.where('install_rows', r => rowIds.has(r.light_row_id)).forEach(r => removeRow('install_rows', r.id));
  s.where('area_controls', c => areaIds.has(c.area_id)).forEach(c => removeRow('area_controls', c.id));
  s.where('area_photos', p => areaIds.has(p.area_id)).forEach(p => { deleteLocalPhoto(p._localUri); removeRow('area_photos', p.id); });
  s.where('job_issues', i => i.job_id === jobId).forEach(i => { deleteLocalPhoto(i._localUri); removeRow('job_issues', i.id); });
  rowIds.forEach(id => removeRow('light_rows', id));
  areaIds.forEach(id => removeRow('areas', id));
  removeRow('jobs', jobId);
}
