import type { ImagePickerAsset } from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { logChange, notifyJobIssue } from '../../constants/notifications';
import { getCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';
import {
  CAMERA_DENIED_MESSAGE, photoPath, photoUrl, pickFromCamera, pickFromLibrary, removeFromBucket, uploadToBucket,
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
  const [job, setJob] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('open');

  // New issue form
  const [formOpen, setFormOpen] = useState(!!fromAreaId);
  const [category, setCategory] = useState<IssueCategory>('bad_light');
  const [formAreaId, setFormAreaId] = useState<string | null>(fromAreaId ?? null);
  const [formRowId, setFormRowId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, [jobId]);

  async function loadAll() {
    const [{ data: jobData }, { data: areaData }] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', jobId).single(),
      supabase.from('areas').select('id, name, light_rows(*)').eq('job_id', jobId).order('created_at'),
    ]);
    if (jobData) setJob(jobData);
    if (areaData) setAreas(areaData);
    await loadIssues();
    setLoading(false);
  }

  async function loadIssues() {
    const { data } = await supabase
      .from('job_issues')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    if (data) setIssues(data);
  }

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

    let path: string | null = null;
    if (photo) {
      path = photoPath(`${jobId}/issues`, photo);
      const { error: uploadError } = await uploadToBucket(path, photo);
      if (uploadError) {
        setSubmitting(false);
        return setError('The photo could not be uploaded. Check your connection, or remove the photo and try again.');
      }
    }

    const { data, error: insertError } = await supabase
      .from('job_issues')
      .insert({
        job_id: jobId,
        area_id: formAreaId,
        light_row_id: formRowId,
        category,
        note: note.trim(),
        photo_path: path,
        created_by_name: user?.name ?? null,
      })
      .select()
      .single();

    if (insertError || !data) {
      if (path) await removeFromBucket(path);
      setSubmitting(false);
      return setError('The issue could not be saved. Check your connection and try again.');
    }

    setIssues(prev => [data, ...prev]);
    setFilter(f => (f === 'resolved' ? 'open' : f));
    const label = categoryInfo(category).label;
    try {
      await logChange(formAreaId, jobId, user?.id, user?.name, 'issue_logged', `${label}: ${note.trim().slice(0, 80)}`);
      await notifyJobIssue(job?.name, label, user?.id);
    } catch (e) { console.log('Issue notify error:', e); }

    resetForm();
    setFormOpen(false);
    setSubmitting(false);
  }

  async function setResolved(issue: any, resolved: boolean) {
    const patch = { status: resolved ? 'resolved' : 'open', resolved_at: resolved ? new Date().toISOString() : null };
    const { error: updateError } = await supabase.from('job_issues').update(patch).eq('id', issue.id);
    if (updateError) return setError('Could not update the issue. Try again.');
    setIssues(prev => prev.map(i => (i.id === issue.id ? { ...i, ...patch } : i)));
  }

  async function deleteIssue(issue: any) {
    const { error: deleteError } = await supabase.from('job_issues').delete().eq('id', issue.id);
    if (deleteError) return setError('Could not delete the issue. Try again.');
    if (issue.photo_path) await removeFromBucket(issue.photo_path);
    setIssues(prev => prev.filter(i => i.id !== issue.id));
  }

  const openCount = issues.filter(i => i.status === 'open').length;
  const visibleIssues = issues.filter(i => filter === 'all' || i.status === filter);
  const backHref = fromAreaId ? `/electrician?areaId=${fromAreaId}&jobId=${jobId}` : `/area-list?jobId=${jobId}`;

  return {
    job, areas, loading, filter, setFilter, openCount, visibleIssues, issueLocation, backHref,
    formOpen, setFormOpen, category, setCategory, formAreaId, chooseArea, formRowId, setFormRowId,
    rowsForArea, note, setNote, photo, setPhoto, takeIssuePhoto, chooseIssuePhoto,
    submitting, canSubmit, submitIssue, error, setResolved, deleteIssue, photoUrl, resetForm,
  };
}
