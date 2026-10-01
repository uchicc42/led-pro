import { router } from 'expo-router';
import { useEffect, useState, type CSSProperties } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAreaList } from './useAreaList';

// Web-only UI built with DOM elements. Metro only bundles this file for web; native uses AreaListScreen.tsx.

function readStoredSession() {
  if (typeof window === 'undefined') return null; // static render runs in Node

  try {
    return JSON.parse(localStorage.getItem('led_pro_current_session') || 'null');
  } catch (e) {
    console.log('Error loading user:', e);
    return null;
  }
}

export default function AreaListScreen() {
  const {
    jobId, job, loading, addingArea, setAddingArea, newAreaName, setNewAreaName,
    filter, setFilter, jobNotes, notesSaved, saveJobNotes, addArea, toggleComplete, deleteArea,
    getFilteredAreas, completed, total, progress,
  } = useAreaList({ live: 'poll', initialUser: readStoredSession });
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const isElectrician = readStoredSession()?.role === 'electrician';

  useEffect(() => {
    const handler = () => setMenuOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <div style={webStyles.page}>
      <div style={webStyles.container}>

        <div style={webStyles.header}>
          <button style={webStyles.backBtn} onClick={() => router.push('/home')}>
            ← Back
          </button>
          <div style={{ flex: 1 }}>
            <div style={webStyles.headerTitle}>{job?.name}</div>
            <div style={webStyles.headerSub}>
              <span style={{
                ...webStyles.modeBadge,
                background: job?.mode === 'electrician' ? '#FAECE7' : '#E1F5EE',
                color: job?.mode === 'electrician' ? '#712B13' : '#085041',
              }}>
                {job?.mode === 'electrician' ? 'Electrician' : 'Counting'}
              </span>
              <span style={webStyles.headerDate}>
                {job?.date && new Date(job.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div style={webStyles.progressWrap}>
          <div style={webStyles.progressLabel}>
            <span>{completed} of {total} areas complete</span>
            <span style={{ color: Colors.blue, fontWeight: '500' }}>{Math.round(progress)}%</span>
          </div>
          <div style={webStyles.progressTrack}>
            <div style={{ ...webStyles.progressFill, width: `${progress}%` }} />
          </div>
        </div>

        <div style={webStyles.filterRow}>
          {['all', 'todo', 'complete', 'mine'].map(f => (
            <div
              key={f}
              style={{ ...webStyles.filterPill, ...(filter === f ? webStyles.filterPillActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </div>
          ))}
        </div>

        <div style={webStyles.areaList}>
          {getFilteredAreas().map(area => (
            <div key={area.id} style={{
              ...webStyles.areaCard,
              borderLeft: `4px solid ${area.is_complete ? Colors.green : Colors.blue}`,
            }}>
              <div style={webStyles.areaCardContent}>
                <div style={webStyles.areaTop}>
                  <div style={webStyles.areaName}>{area.name}</div>
                  <div style={webStyles.areaActions}>
                    {area.entered_by && (
                      <div style={{
                        ...webStyles.nameTag,
                        background: area.entered_by.color + '22',
                        color: area.entered_by.color,
                      }}>
                        {area.entered_by.initials}
                      </div>
                    )}
                    <button
                      style={{
                        ...webStyles.completeBtn,
                        background: area.is_complete ? Colors.green : '#fff',
                        color: area.is_complete ? '#fff' : Colors.textTertiary,
                        border: `1px solid ${area.is_complete ? Colors.green : '#e0e7ef'}`,
                      }}
                      onClick={() => toggleComplete(area)}
                    >
                      {area.is_complete ? '✓ Complete' : 'Mark done'}
                    </button>
                    <button
                      style={webStyles.editBtn}
                      onClick={() => router.push(`/area-entry?areaId=${area.id}&jobId=${jobId}`)}
                    >
                      Edit →
                    </button>
                    <button
                      style={{...webStyles.editBtn, background: '#FAECE7', color: '#712B13', borderColor: '#D08A6E'}}
                      onClick={() => router.push(`/electrician?areaId=${area.id}&jobId=${jobId}`)}
                    >
                      ⚡ Electrician
                    </button>
                    {!isElectrician && (
                      <div style={{ position: 'relative' }}>
                        <button
                          style={{ ...webStyles.editBtn, fontSize: 16, padding: '4px 10px', fontWeight: '700' }}
                          onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === area.id ? null : area.id); }}
                        >
                          ···
                        </button>
                        {menuOpen === area.id && (
                          <div style={webStyles.dropdownMenu} onClick={e => e.stopPropagation()}>
                            <div
                              style={webStyles.dropdownItem}
                              onClick={() => { deleteArea(area); setMenuOpen(null); }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#FCEBEB'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                            >
                              🗑 Delete area
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div style={webStyles.areaMeta}>
                  <span style={webStyles.areaCount}>
                    {area.light_rows?.length || 0} light rows
                  </span>
                  {area.entered_by && (
                    <span style={webStyles.enteredBy}>Added by {area.entered_by.name}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {getFilteredAreas().length === 0 && (
            <div style={webStyles.emptyState}>
              {filter === 'all' ? 'No areas yet — add your first one below!' : `No ${filter} areas.`}
            </div>
          )}
        </div>

        {/* Job notes */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Job notes</span>
            {notesSaved && <span style={{ color: Colors.green, fontSize: 11 }}>✓ Saved</span>}
          </div>
          <textarea
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 13, border: '0.5px solid #e0e7ef', borderRadius: 10, outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 80 }}
            placeholder="Add job-wide notes here — visible to all team members..."
            value={jobNotes}
            onChange={e => saveJobNotes(e.target.value)}
          />
        </div>

        {!isElectrician && (addingArea ? (
          <div style={webStyles.addAreaForm}>
            <input
              autoFocus
              style={webStyles.addAreaInput}
              placeholder="Area name (e.g. Gym, Hallway A)"
              value={newAreaName}
              onChange={e => setNewAreaName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addArea(); if (e.key === 'Escape') setAddingArea(false); }}
            />
            <button style={webStyles.addAreaConfirm} onClick={addArea}>Add</button>
            <button style={webStyles.addAreaCancel} onClick={() => { setAddingArea(false); setNewAreaName(''); }}>Cancel</button>
          </div>
        ) : (
        <>
          <button
            style={{ ...webStyles.addBtn, background: Colors.blue, color: '#fff', border: 'none', marginBottom: 10 }}
            onClick={() => router.push(`/scope-export?jobId=${jobId}`)}
          >
            📄 Export scope of work
          </button>
          <button
            style={{ ...webStyles.addBtn, background: '#fff', color: Colors.textSecondary, border: '0.5px solid #e0e7ef', marginBottom: 10 }}
            onClick={() => router.push(`/change-log?jobId=${jobId}`)}
          >
            🕐 Change log
          </button>
          <button style={webStyles.addBtn} onClick={() => setAddingArea(true)}>
            + Add area
          </button>
        </>
        ))}
      </div>
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 800, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary, whiteSpace: 'nowrap' },
  headerTitle: { fontSize: 24, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  headerSub: { display: 'flex', alignItems: 'center', gap: 10 },
  modeBadge: { fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: '500' },
  headerDate: { fontSize: 12, color: Colors.textTertiary },
  progressWrap: { marginBottom: 20 },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  progressTrack: { height: 6, background: '#e0e7ef', borderRadius: 3 },
  progressFill: { height: 6, background: Colors.blue, borderRadius: 3, transition: 'width 0.3s' },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20 },
  filterPill: { padding: '5px 14px', borderRadius: 20, borderWidth: 0.5, borderStyle: 'solid', borderColor: '#e0e7ef', background: '#fff', fontSize: 12, color: Colors.textSecondary, cursor: 'pointer' },
  filterPillActive: { background: '#E6F1FB', color: '#0C447C', borderColor: Colors.blue },
  areaList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
  areaCard: { background: '#fff', borderRadius: 12, border: '0.5px solid #e0e7ef', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  areaCardContent: { padding: '14px 18px' },
  areaTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  areaName: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  areaActions: { display: 'flex', alignItems: 'center', gap: 8 },
  nameTag: { width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: '600' },
  completeBtn: { padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: '500' },
  editBtn: { padding: '4px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: Colors.bgSecondary, borderWidth: 0.5, borderStyle: 'solid', borderColor: '#e0e7ef', color: Colors.blue },
  areaMeta: { display: 'flex', gap: 12, alignItems: 'center' },
  areaCount: { fontSize: 12, color: Colors.textTertiary },
  enteredBy: { fontSize: 12, color: Colors.textTertiary },
  emptyState: { background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: Colors.textTertiary, border: '0.5px dashed #e0e7ef' },
  addAreaForm: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 },
  addAreaInput: { flex: 1, padding: '10px 14px', fontSize: 14, border: '0.5px solid #e0e7ef', borderRadius: 10, outline: 'none', fontFamily: 'inherit' },
  addAreaConfirm: { padding: '10px 20px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: '500' },
  addAreaCancel: { padding: '10px 16px', background: '#fff', color: Colors.textSecondary, border: '0.5px solid #e0e7ef', borderRadius: 10, fontSize: 14, cursor: 'pointer' },
  addBtn: { width: '100%', padding: '12px', background: 'transparent', border: '1px dashed #c0cfe0', borderRadius: 10, fontSize: 14, color: Colors.blue, cursor: 'pointer', textAlign: 'center' },
  dropdownMenu: { position: 'absolute', right: 0, top: '110%', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 160, overflow: 'hidden' },
  dropdownItem: { padding: '10px 16px', fontSize: 13, color: '#A32D2D', cursor: 'pointer', background: '#fff' },
};
