import { router } from 'expo-router';
import type { CSSProperties } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { ISSUE_CATEGORIES, StatusFilter, categoryInfo, describeLightRow, useJobIssues } from './useJobIssues';

// Web-only UI built with DOM elements. Metro only bundles this file for web; native uses JobIssuesScreen.tsx.

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

export default function JobIssuesScreen() {
  const {
    job, areas, loading, filter, setFilter, openCount, visibleIssues, issueLocation, backHref,
    formOpen, setFormOpen, category, setCategory, formAreaId, chooseArea, formRowId, setFormRowId,
    rowsForArea, note, setNote, photo, setPhoto, chooseIssuePhoto,
    submitting, canSubmit, submitIssue, error, setResolved, deleteIssue, photoUrl, resetForm,
  } = useJobIssues();

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  const areaRows = rowsForArea(formAreaId);

  return (
    <div style={webStyles.page}>
      <div style={webStyles.container}>
        <div style={webStyles.header}>
          <button style={webStyles.backBtn} onClick={() => router.push(backHref as any)}>← Back</button>
          <div style={{ flex: 1 }}>
            <div style={webStyles.headerTitle}>Issue log</div>
            <div style={webStyles.headerSub}>{job?.name} · {openCount} open</div>
          </div>
          {!formOpen && (
            <button style={webStyles.newBtn} onClick={() => setFormOpen(true)}>+ Log an issue</button>
          )}
        </div>

        {formOpen && (
          <div style={webStyles.card}>
            <div style={webStyles.fieldLabel}>What happened?</div>
            <div style={webStyles.chipWrap}>
              {ISSUE_CATEGORIES.map(c => (
                <div
                  key={c.key}
                  style={{ ...webStyles.chip, ...(category === c.key ? { background: c.bg, color: c.fg, borderColor: c.fg, fontWeight: '600' } : {}) }}
                  onClick={() => setCategory(c.key)}
                >
                  {c.icon} {c.label}
                </div>
              ))}
            </div>

            <div style={webStyles.twoCol}>
              <div style={{ flex: 1 }}>
                <div style={webStyles.fieldLabel}>Where?</div>
                <select style={webStyles.select} value={formAreaId ?? ''} onChange={e => chooseArea(e.target.value || null)}>
                  <option value="">Whole job</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={webStyles.fieldLabel}>Which lights? (optional)</div>
                <select
                  style={webStyles.select}
                  value={formRowId ?? ''}
                  onChange={e => setFormRowId(e.target.value || null)}
                  disabled={areaRows.length === 0}
                >
                  <option value="">Not specific</option>
                  {areaRows.map((r: any) => <option key={r.id} value={r.id}>{describeLightRow(r)}</option>)}
                </select>
              </div>
            </div>

            <div style={webStyles.fieldLabel}>Details *</div>
            <textarea
              style={webStyles.noteInput}
              rows={3}
              placeholder="e.g. 2 fixtures DOA, ballast burnt out on the third"
              value={note}
              onChange={e => setNote(e.target.value)}
            />

            <div style={webStyles.photoRow}>
              {photo ? (
                <>
                  <img src={photo.uri} alt="Issue" style={webStyles.photoPreview} />
                  <span style={webStyles.removePhoto} onClick={() => setPhoto(null)}>Remove photo</span>
                </>
              ) : (
                <button style={webStyles.secondaryBtn} onClick={chooseIssuePhoto}>📷 Attach photo</button>
              )}
            </div>

            {error && <div style={webStyles.error}>{error}</div>}

            <div style={webStyles.formActions}>
              <button style={webStyles.secondaryBtn} onClick={() => { resetForm(); setFormOpen(false); }}>Cancel</button>
              <button
                style={{ ...webStyles.submitBtn, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
                onClick={submitIssue}
                disabled={!canSubmit}
              >
                {submitting ? 'Saving…' : 'Log issue'}
              </button>
            </div>
          </div>
        )}

        <div style={webStyles.filterRow}>
          {FILTERS.map(f => (
            <div
              key={f.key}
              style={{ ...webStyles.filterPill, ...(filter === f.key ? webStyles.filterPillActive : {}) }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </div>
          ))}
        </div>

        {!formOpen && error && <div style={webStyles.error}>{error}</div>}

        {visibleIssues.length === 0 ? (
          <div style={webStyles.emptyState}>
            {filter === 'open' ? 'No open issues. 👍' : filter === 'resolved' ? 'No resolved issues yet.' : 'No issues logged yet.'}
          </div>
        ) : (
          <div style={webStyles.list}>
            {visibleIssues.map(issue => {
              const c = categoryInfo(issue.category);
              const resolved = issue.status === 'resolved';
              return (
                <div key={issue.id} style={{ ...webStyles.issueCard, opacity: resolved ? 0.65 : 1 }}>
                  <div style={webStyles.issueMain}>
                    <div style={webStyles.issueTop}>
                      <span style={{ ...webStyles.badge, background: c.bg, color: c.fg }}>{c.icon} {c.label}</span>
                      <span style={webStyles.issueLocation}>{issueLocation(issue)}</span>
                      {resolved && <span style={webStyles.resolvedTag}>✓ Resolved</span>}
                    </div>
                    <div style={webStyles.issueNote}>{issue.note}</div>
                    <div style={webStyles.issueMeta}>
                      {issue.created_by_name ? `${issue.created_by_name} · ` : ''}
                      {new Date(issue.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                    <div style={webStyles.issueActions}>
                      <button style={webStyles.resolveBtn} onClick={() => setResolved(issue, !resolved)}>
                        {resolved ? 'Reopen' : '✓ Mark resolved'}
                      </button>
                      <button
                        style={webStyles.deleteBtn}
                        onClick={() => { if (window.confirm('Remove this issue from the log?')) deleteIssue(issue); }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {issue.photo_path && (
                    <a href={photoUrl(issue.photo_path)} target="_blank" rel="noreferrer">
                      <img src={photoUrl(issue.photo_path)} alt="Issue" style={webStyles.issuePhoto} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 800, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary },
  headerTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  newBtn: { padding: '10px 18px', background: Colors.coral, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: '500', cursor: 'pointer' },
  card: { background: '#fff', borderRadius: 14, padding: '20px 24px', border: '0.5px solid #e0e7ef', marginBottom: 20 },
  fieldLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '12px 0 8px' },
  chipWrap: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: { padding: '7px 14px', borderRadius: 20, borderWidth: 0.5, borderStyle: 'solid', borderColor: '#e0e7ef', background: Colors.bgSecondary, fontSize: 13, color: Colors.textSecondary, cursor: 'pointer' },
  twoCol: { display: 'flex', gap: 16 },
  select: { width: '100%', padding: '9px 10px', fontSize: 13, border: '0.5px solid #e0e7ef', borderRadius: 8, background: '#fff', outline: 'none' },
  noteInput: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14, border: '0.5px solid #e0e7ef', borderRadius: 8, outline: 'none', fontFamily: 'inherit', resize: 'vertical' },
  photoRow: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 },
  photoPreview: { width: 72, height: 72, objectFit: 'cover', borderRadius: 8 },
  removePhoto: { fontSize: 13, color: '#A32D2D', cursor: 'pointer' },
  error: { color: '#A32D2D', fontSize: 13, marginTop: 10 },
  formActions: { display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
  secondaryBtn: { padding: '9px 16px', background: '#fff', color: Colors.textSecondary, border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  submitBtn: { padding: '9px 22px', background: Colors.coral, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: '500' },
  filterRow: { display: 'flex', gap: 8, marginBottom: 14 },
  filterPill: { padding: '5px 14px', borderRadius: 20, borderWidth: 0.5, borderStyle: 'solid', borderColor: '#e0e7ef', background: '#fff', fontSize: 12, color: Colors.textSecondary, cursor: 'pointer' },
  filterPillActive: { background: '#E6F1FB', color: '#0C447C', borderColor: Colors.blue },
  emptyState: { background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: Colors.textTertiary, border: '0.5px dashed #e0e7ef' },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  issueCard: { background: '#fff', borderRadius: 12, border: '0.5px solid #e0e7ef', padding: '14px 18px', display: 'flex', gap: 16 },
  issueMain: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  issueTop: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  badge: { fontSize: 12, padding: '2px 10px', borderRadius: 20, fontWeight: '500' },
  issueLocation: { fontSize: 12, color: Colors.textSecondary },
  resolvedTag: { fontSize: 12, color: Colors.green, fontWeight: '500', marginLeft: 'auto' },
  issueNote: { fontSize: 14, color: Colors.textPrimary, lineHeight: '20px', whiteSpace: 'pre-wrap' },
  issueMeta: { fontSize: 11, color: Colors.textTertiary },
  issueActions: { display: 'flex', gap: 8, marginTop: 4 },
  resolveBtn: { padding: '6px 14px', background: '#fff', color: Colors.teal, border: `1px solid ${Colors.green}`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: '500' },
  deleteBtn: { padding: '6px 12px', background: 'transparent', color: '#A32D2D', border: 'none', fontSize: 12, cursor: 'pointer' },
  issuePhoto: { width: 120, height: 120, objectFit: 'cover', borderRadius: 8 },
};
