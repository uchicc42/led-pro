import type { ImagePickerAsset } from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '../../constants/userStore';
import { useOnline } from '../../lib/offline/connectivity';
import { deleteRow, newId, patchRow, queueCall, saveRow } from '../../lib/offline/data';
import { useStore } from '../../lib/offline/store';
import { trackJob } from '../../lib/offline/sync';
import { usePhotoLinks } from '../../lib/photoUrls';
import {
  CAMERA_DENIED_MESSAGE, displayUrl, photoPath, pickFromCamera, pickFromLibrary, removePhotoFile, savePhoto,
} from '../area-photos/pickPhotos';

export type IssueCategory = 'bad_light' | 'scope_change' | 'missing_material' | 'other';

export const ISSUE_CATEGORIES: { key: IssueCategory; label: string; icon: string; bg: string; fg: string }[] = [
  { key: 'bad_light', label: 'Bad light', icon: '💡', bg: '#FCEBEB', fg: '#A32D2D' },
  { key: 'scope_change', label: 'Scope change', icon: '✏️', bg: '#E6F1FB', fg: '#0C447C' },
  { key: 'missing_material', label: 'Missing material', icon: '📦', bg: '#FAEEDA', fg: '#854F0B' },
  { key: 'other', label: 'Other', icon: '📝', bg: '#F0F0EE', fg: '#555' },
];

export const categoryInfo = (key: string) => ISSUE_CATEGORIES.find(c => c.key === key) ?? ISSUE_CATEGORIES[3];

export type StatusFilter = 'open' | 'resolved' | 'all';

export function describeLightRow(row: any) {
  if (row.new_addition) return `New: ${row.new_quantity} × ${row.new_light_type || '?'}`;
  if (row.removed_only) return `Remove: ${row.quantity} × ${row.light_type_id || '?'}`;
  return `${row.quantity} × ${row.light_type_id || '?'} → ${row.new_quantity} × ${row.new_light_type || '?'}`;
}

export function useJobIssues() {
  // areaId is set when opened from the electrician screen: the form starts open with that area chosen.
  const { jobId, areaId: fromAreaId } = useLocalSearchParams<{ jobId: string; areaId?: string }>();
  const store = useStore();
  const online = useOnline();
  const [filter, setFilter] = useState<StatusFilter>('open');

  // Everything comes from the device copy, so issues can be logged and resolved offline.
  const job = store.get('jobs', jobId) ?? null;
  const areas = store.where('areas', a => a.job_id === jobId)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((a): any => ({ ...a, light_rows: store.where('light_rows', r => r.area_id === a.id) }));
  const issues = store.where('job_issues', i => i.job_id === jobId)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const loading = !store.loaded || (!job && online);
  const notOnDevice = store.loaded && !job && !online;

  // New issue form
  const [formOpen, setFormOpen] = useState(!!fromAreaId);
  const [category, setCategory] = useState<IssueCategory>('bad_light');
  const [formAreaId, setFormAreaId] = useState<string | null>(fromAreaId ?? null);
  const [formRowId, setFormRowId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      trackJob(jobId);
    }, [jobId])
  );

  useEffect(() => {
    setFormAreaId(fromAreaId ?? null);
    setFormRowId(null);
    setFormOpen(!!fromAreaId);
  }, [fromAreaId]);

  const areaById = (id: string | null) => areas.find(a => a.id === id);
  const rowsForArea = (id: string | null) =>
    [...(areaById(id)?.light_rows || [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  function issueLocation(issue: any) {
    const area = areaById(issue.area_id);
    if (!area) return 'Whole job';
    const row = (area.light_rows || []).find((r: any) => r.id === issue.light_row_id);
    return row ? `${area.name} · ${describeLightRow(row)}` : area.name;
  }

  function chooseArea(id: string | null) {
    setFormAreaId(id);
    setFormRowId(null);
  }

  async function takeIssuePhoto() {
    setError('');
    const assets = await pickFromCamera();
    if (assets === null) return setError(CAMERA_DENIED_MESSAGE);
    if (assets[0]) setPhoto(assets[0]);
  }

  async function chooseIssuePhoto() {
    setError('');
    const assets = await pickFromLibrary(false);
    if (assets[0]) setPhoto(assets[0]);
  }

  function resetForm() {
    setCategory('bad_light');
    setFormAreaId(fromAreaId ?? null);
    setFormRowId(null);
    setNote('');
    setPhoto(null);
    setError('');
  }

  const canSubmit = note.trim().length > 0 && !submitting;

  async function submitIssue() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    const user = await getCurrentUser();

    // The photo (if any) is kept on the phone and uploads before the issue record does.
    let path: string | null = null;
    let localUri: string | null = null;
    if (photo) {
      path = photoPath(`${jobId}/issues`, photo);
      const saved = await savePhoto(path, photo);
      if (saved.error) {
        setSubmitting(false);
        return setError(saved.error);
      }
      localUri = saved.localUri ?? null;
    }

    saveRow('job_issues', {
      id: newId(),
      job_id: jobId,
      area_id: formAreaId,
      light_row_id: formRowId,
      category,
      note: note.trim(),
      photo_path: path,
      status: 'open',
      created_by_name: user?.name ?? null,
      created_at: new Date().toISOString(),
      _localUri: localUri,
    });

    setFilter(f => (f === 'resolved' ? 'open' : f));
    const label = categoryInfo(category).label;
    queueCall('logChange', formAreaId, jobId, user?.id, user?.name, 'issue_logged', `${label}: ${note.trim().slice(0, 80)}`);
    queueCall('notifyJobIssue', job?.name, label, user?.id);

    resetForm();
    setFormOpen(false);
    setSubmitting(false);
  }

  function setResolved(issue: any, resolved: boolean) {
    patchRow('job_issues', issue.id, { status: resolved ? 'resolved' : 'open', resolved_at: resolved ? new Date().toISOString() : null });
  }

  function deleteIssue(issue: any) {
    deleteRow('job_issues', issue.id);
    if (issue.photo_path) removePhotoFile(issue.photo_path, issue._localUri);
  }

  // Show an issue's photo from this phone if it's still here, otherwise from online storage.
  const linkFor = usePhotoLinks(issues.filter(i => i.photo_path && !i._localUri).map(i => i.photo_path));
  const photoUrl = (path: string) => displayUrl(issues.find(i => i.photo_path === path)?._localUri, linkFor(path));

  const openCount = issues.filter(i => i.status === 'open').length;
  const visibleIssues = issues.filter(i => filter === 'all' || i.status === filter);
  const backHref = fromAreaId ? `/electrician?areaId=${fromAreaId}&jobId=${jobId}` : `/area-list?jobId=${jobId}`;

  return {
    job, areas, loading, notOnDevice, filter, setFilter, openCount, visibleIssues, issueLocation, backHref,
    formOpen, setFormOpen, category, setCategory, formAreaId, chooseArea, formRowId, setFormRowId,
    rowsForArea, note, setNote, photo, setPhoto, takeIssuePhoto, chooseIssuePhoto,
    submitting, canSubmit, submitIssue, error, setResolved, deleteIssue, photoUrl, resetForm,
  };
}
