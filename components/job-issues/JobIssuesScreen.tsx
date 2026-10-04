import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { NotOnDevice } from '../ui/not-on-device';
import { PhotoViewer } from '../ui/photo-viewer';
import { KeyboardScrollView } from '../ui/keyboard-scroll-view';
import { ISSUE_CATEGORIES, StatusFilter, categoryInfo, describeLightRow, useJobIssues } from './useJobIssues';

// Native UI. The web UI lives in JobIssuesScreen.web.tsx; Metro picks the right file per platform.

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

export default function JobIssuesScreen() {
  const {
    job, areas, loading, notOnDevice, filter, setFilter, openCount, visibleIssues, issueLocation, backHref,
    formOpen, setFormOpen, category, setCategory, formAreaId, chooseArea, formRowId, setFormRowId,
    rowsForArea, note, setNote, photo, setPhoto, takeIssuePhoto, chooseIssuePhoto,
    submitting, canSubmit, submitIssue, error, setResolved, deleteIssue, photoUrl, resetForm,
  } = useJobIssues();
  // Storage path of the issue photo being viewed.
  const [viewingPath, setViewingPath] = useState<string | null>(null);

  function confirmDelete(issue: any) {
    Alert.alert('Delete issue', 'Remove this issue from the log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteIssue(issue) },
    ]);
  }

  if (notOnDevice) return <NotOnDevice backHref={backHref} />;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  const areaRows = rowsForArea(formAreaId);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(backHref as any)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Issue log</Text>
          <View style={{ width: 50 }} />
        </View>
        <Text style={styles.jobName}>{job?.name} · {openCount} open</Text>

        {!formOpen ? (
          <TouchableOpacity style={styles.newBtn} onPress={() => setFormOpen(true)}>
            <Text style={styles.newBtnText}>+ Log an issue</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>What happened?</Text>
            <View style={styles.chipWrap}>
              {ISSUE_CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.chip, category === c.key && { backgroundColor: c.bg, borderColor: c.fg }]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={[styles.chipText, category === c.key && { color: c.fg, fontWeight: '600' }]}>
                    {c.icon} {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Where?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, !formAreaId && styles.chipActive]} onPress={() => chooseArea(null)}>
                <Text style={[styles.chipText, !formAreaId && styles.chipTextActive]}>Whole job</Text>
              </TouchableOpacity>
              {areas.map(a => (
                <TouchableOpacity key={a.id} style={[styles.chip, formAreaId === a.id && styles.chipActive]} onPress={() => chooseArea(a.id)}>
                  <Text style={[styles.chipText, formAreaId === a.id && styles.chipTextActive]}>{a.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {areaRows.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Which lights? (optional)</Text>
                <View style={styles.chipWrap}>
                  <TouchableOpacity style={[styles.chip, !formRowId && styles.chipActive]} onPress={() => setFormRowId(null)}>
                    <Text style={[styles.chipText, !formRowId && styles.chipTextActive]}>Not specific</Text>
                  </TouchableOpacity>
                  {areaRows.map((r: any) => (
                    <TouchableOpacity key={r.id} style={[styles.chip, formRowId === r.id && styles.chipActive]} onPress={() => setFormRowId(r.id)}>
                      <Text style={[styles.chipText, formRowId === r.id && styles.chipTextActive]}>{describeLightRow(r)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.fieldLabel}>Details *</Text>
            <TextInput
              style={styles.noteInput}
              multiline
              placeholder="e.g. 2 fixtures DOA, ballast burnt out on the third"
              placeholderTextColor={Colors.textTertiary}
              value={note}
              onChangeText={setNote}
            />

            {photo ? (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} contentFit="cover" />
                <TouchableOpacity onPress={() => setPhoto(null)}>
                  <Text style={styles.removePhoto}>Remove photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoBtnRow}>
                <TouchableOpacity style={styles.photoBtn} onPress={takeIssuePhoto}>
                  <Text style={styles.photoBtnText}>📷 Add photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={chooseIssuePhoto}>
                  <Text style={styles.photoBtnText}>🖼 From library</Text>
                </TouchableOpacity>
              </View>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetForm(); setFormOpen(false); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, !canSubmit && { opacity: 0.5 }]}
                onPress={submitIssue}
                disabled={!canSubmit}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Log issue</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} style={[styles.filterPill, filter === f.key && styles.filterPillActive]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!formOpen && !!error && <Text style={styles.error}>{error}</Text>}

        {visibleIssues.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {filter === 'open' ? 'No open issues. 👍' : filter === 'resolved' ? 'No resolved issues yet.' : 'No issues logged yet.'}
            </Text>
          </View>
        ) : (
          visibleIssues.map(issue => {
            const c = categoryInfo(issue.category);
            const resolved = issue.status === 'resolved';
            return (
              <View key={issue.id} style={[styles.issueCard, resolved && { opacity: 0.65 }]}>
                <View style={styles.issueTop}>
                  <View style={[styles.badge, { backgroundColor: c.bg }]}>
                    <Text style={[styles.badgeText, { color: c.fg }]}>{c.icon} {c.label}</Text>
                  </View>
                  {resolved && <Text style={styles.resolvedTag}>✓ Resolved</Text>}
                </View>
                <Text style={styles.issueLocation}>{issueLocation(issue)}</Text>
                <Text style={styles.issueNote}>{issue.note}</Text>
                {issue.photo_path && (
                  <TouchableOpacity onPress={() => setViewingPath(issue.photo_path)}>
                    <Image source={{ uri: photoUrl(issue.photo_path), cacheKey: issue.photo_path }} style={styles.issuePhoto} contentFit="cover" cachePolicy="memory-disk" />
                  </TouchableOpacity>
                )}
                <Text style={styles.issueMeta}>
                  {issue.created_by_name ? `${issue.created_by_name} · ` : ''}
                  {new Date(issue.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </Text>
                <View style={styles.issueActions}>
                  <TouchableOpacity style={styles.resolveBtn} onPress={() => setResolved(issue, !resolved)}>
                    <Text style={styles.resolveBtnText}>{resolved ? 'Reopen' : '✓ Mark resolved'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(issue)}>
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </KeyboardScrollView>

      <PhotoViewer uri={viewingPath ? photoUrl(viewingPath) || null : null} cacheKey={viewingPath ?? undefined} onClose={() => setViewingPath(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { padding: 20, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { fontSize: 14, color: Colors.blue },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  jobName: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', marginBottom: 16 },
  newBtn: { backgroundColor: Colors.coral, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  formCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: Colors.borderLight, padding: 14, marginBottom: 16 },
  fieldLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRow: { gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.borderLight, backgroundColor: Colors.bgSecondary },
  chipActive: { backgroundColor: '#E6F1FB', borderColor: Colors.blue },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: '#0C447C', fontWeight: '600' },
  noteInput: { backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 10, padding: 12, fontSize: 14, color: Colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  photoBtnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  photoBtn: { flex: 1, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: Colors.bgSecondary },
  photoBtnText: { fontSize: 13, color: Colors.textSecondary },
  photoPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  photoPreview: { width: 72, height: 72, borderRadius: 8 },
  removePhoto: { fontSize: 13, color: '#A32D2D' },
  error: { fontSize: 13, color: '#A32D2D', marginTop: 10 },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cancelBtn: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.borderLight },
  cancelBtnText: { fontSize: 14, color: Colors.textSecondary },
  submitBtn: { flex: 2, backgroundColor: Colors.coral, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.borderLight, backgroundColor: '#fff' },
  filterPillActive: { backgroundColor: '#E6F1FB', borderColor: Colors.blue },
  filterText: { fontSize: 12, color: Colors.textSecondary },
  filterTextActive: { color: '#0C447C', fontWeight: '600' },
  emptyState: { backgroundColor: '#fff', borderRadius: 12, padding: 28, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.borderLight, borderStyle: 'dashed' },
  emptyText: { color: Colors.textTertiary, fontSize: 14 },
  issueCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: Colors.borderLight, padding: 14, marginBottom: 10, gap: 6 },
  issueTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  resolvedTag: { fontSize: 12, color: Colors.green, fontWeight: '500' },
  issueLocation: { fontSize: 12, color: Colors.textSecondary },
  issueNote: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  issuePhoto: { width: '100%', height: 160, borderRadius: 8, marginTop: 4 },
  issueMeta: { fontSize: 11, color: Colors.textTertiary },
  issueActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  resolveBtn: { flex: 2, borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.green },
  resolveBtnText: { fontSize: 13, color: Colors.teal, fontWeight: '500' },
  deleteBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  deleteBtnText: { fontSize: 13, color: '#A32D2D' },
});
