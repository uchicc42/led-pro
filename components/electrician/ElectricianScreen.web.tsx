import { router } from 'expo-router';
import type { CSSProperties } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import AreaPhotos from '../area-photos/AreaPhotos';
import { CONTROL_LABEL } from '../area-entry/useAreaEntry';
import { withMount } from '../scope-export/useScopeExport';
import { getStatusLabel, useElectrician } from './useElectrician';

// Web-only UI built with DOM elements. Metro only bundles this file for web; native uses ElectricianScreen.tsx.

async function checkConnectivity() {
  return navigator.onLine;
}

const CONTROL_STATUSES = ['pending', 'in_progress', 'complete'];
const statusColors = (s: string) => ({
  bg: s === 'complete' ? '#E1F5EE' : s === 'in_progress' ? '#E6F1FB' : '#F0F0EE',
  fg: s === 'complete' ? '#085041' : s === 'in_progress' ? '#0C447C' : '#555',
  border: s === 'complete' ? Colors.green : s === 'in_progress' ? Colors.blue : '#999',
});

// One sensor/photocell line with its own install status pills.
function ControlStatusLine({ control, status, onStatus }: { control: any; status: string; onStatus: (s: string) => void }) {
  return (
    <div style={webStyles.controlBlock}>
      <div style={webStyles.controlText}>
        {CONTROL_LABEL[control.kind as keyof typeof CONTROL_LABEL]}: {control.quantity} × {control.control_type || '?'}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {CONTROL_STATUSES.map(s => {
          const c = statusColors(s);
          const active = status === s;
          return (
            <div
              key={s}
              style={{
                ...webStyles.statusPill,
                ...(active ? { background: c.bg, color: c.fg, borderColor: c.border, fontWeight: '600' } : {}),
              }}
              onClick={() => onStatus(s)}
            >
              {getStatusLabel(s)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ElectricianScreen() {
  const {
    areaId, jobId, area, job, lightRows, notes, setNotes, needsFollowUp, setNeedsFollowUp,
    loading, saving, isOnlineStatus, getInstallRow, updateInstallRow, save,
    getRowControls, areaLevelControls, getControlStatus, updateControlStatus,
  } = useElectrician(checkConnectivity);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.coral} />
    </View>
  );

  return (
    <div style={webStyles.page}>
      <div style={webStyles.container}>

        {/* Header */}
        <div style={webStyles.header}>
          <button style={webStyles.backBtn} onClick={() => router.push(`/area-list?jobId=${jobId}`)}>
            ← Back
          </button>
          <div>
            <div style={webStyles.headerTitle}>{area?.name}</div>
            <div style={webStyles.headerSub}>{job?.name}</div>
          </div>
          <div style={{
            ...webStyles.onlineBadge,
            background: isOnlineStatus ? '#E1F5EE' : '#FAECE7',
            color: isOnlineStatus ? '#085041' : '#712B13',
          }}>
            {isOnlineStatus ? '● Online' : '● Offline'}
          </div>
        </div>

        <div style={webStyles.modeBadge}>Electrician mode</div>

        {/* Reference panel */}
        <div style={webStyles.refPanel}>
            <div style={webStyles.refLabel}>Reference — from counting</div>
            {lightRows.length === 0 ? (
              <div style={{ fontSize: 13, color: Colors.textTertiary }}>No lights entered yet in counting mode.</div>
            ) : (
              lightRows.map((row, i) => (
                <div key={i} style={webStyles.refRow}>
                  <span style={webStyles.refKey}>
                    {row.removed_only ? '🗑 Remove:' : row.new_addition ? '➕ Add:' : `${row.quantity} × ${withMount(row.light_type_id, row.old_mount)} →`}
                  </span>
                  <span style={webStyles.refVal}>
                    {row.removed_only
                      ? `${row.quantity} × ${withMount(row.light_type_id, row.old_mount)} (no replacement)`
                      : row.new_addition
                      ? `${row.new_quantity} × ${withMount(row.new_light_type, row.new_mount)}`
                      : `${row.new_quantity} × ${withMount(row.new_light_type, row.new_mount)}`
                    }
                  </span>
                </div>
              ))
            )}
          </div>

        <div style={webStyles.card}>
          <AreaPhotos areaId={areaId} jobId={jobId} />
          <div style={webStyles.divider} />

          {/* Install progress */}
          <div style={webStyles.sectionLabel}>Install progress</div>

          {lightRows.length === 0 ? (
            <div style={webStyles.emptyState}>
              No new lights entered for this area yet. Go to counting mode to add them first.
            </div>
          ) : (
            lightRows.map(row => {
              const install = getInstallRow(row.id);
              return (
                <div key={row.id} style={webStyles.installBlock}>
                  <div style={webStyles.installTop}>
                    <div>
                      <div style={webStyles.installType}>
                        {row.new_addition
                          ? `➕ New: ${row.new_quantity} × ${withMount(row.new_light_type, row.new_mount)}`
                          : row.removed_only
                          ? `🗑 Remove: ${row.quantity} × ${withMount(row.light_type_id, row.old_mount)}`
                          : `${row.quantity} × ${withMount(row.light_type_id, row.old_mount)} → ${row.new_quantity} × ${withMount(row.new_light_type, row.new_mount)}`
                        }
                      </div>
                      <div style={webStyles.installQty}>
                        {row.removed_only ? 'Remove only' : `${row.new_quantity || row.quantity} units`}
                      </div>
                    </div>
                  </div>

                  {/* Status pills */}
                  <div style={webStyles.statusPills}>
                    {['pending', 'in_progress', 'complete'].map(s => (
                      <div
                        key={s}
                        style={{
                          ...webStyles.statusPill,
                          ...(install.status === s ? {
                            background: s === 'complete' ? '#E1F5EE' : s === 'in_progress' ? '#E6F1FB' : '#F0F0EE',
                            color: s === 'complete' ? '#085041' : s === 'in_progress' ? '#0C447C' : '#555',
                            borderColor: s === 'complete' ? Colors.green : s === 'in_progress' ? Colors.blue : '#999',
                            fontWeight: '600',
                          } : {})
                        }}
                        onClick={() => updateInstallRow(row.id, 'status', s)}
                      >
                        {getStatusLabel(s)}
                      </div>
                    ))}
                  </div>

                  {/* Removed flag */}
                  <div
                    style={{
                      ...webStyles.removedRow,
                      background: install.removed ? '#FAECE7' : '#fff',
                      borderTop: '0.5px solid #f0f0f0',
                    }}
                  >
                    <span style={webStyles.removedLabel}>Light removed, not replaced here</span>
                    <div
                      style={{
                        ...webStyles.toggle,
                        background: install.removed ? Colors.coral : '#ccc',
                      }}
                      onClick={() => updateInstallRow(row.id, 'removed', !install.removed)}
                    >
                      <div style={{
                        ...webStyles.toggleThumb,
                        transform: install.removed ? 'translateX(16px)' : 'translateX(0)',
                      }} />
                    </div>
                  </div>

                  {install.removed && (
                    <div style={webStyles.removalExpand}>
                      <div style={webStyles.removalLabel}>Reason / note</div>
                      <textarea
                        style={webStyles.removalInput}
                        rows={2}
                        placeholder="Why was this light removed without replacement?"
                        value={install.removal_note || ''}
                        onChange={e => updateInstallRow(row.id, 'removal_note', e.target.value)}
                      />
                    </div>
                  )}

                  {getRowControls(row.id).map(c => (
                    <ControlStatusLine key={c.id} control={c} status={getControlStatus(c)} onStatus={s => updateControlStatus(c.id, s)} />
                  ))}
                </div>
              );
            })
          )}

          {areaLevelControls.length > 0 && (
            <>
              <div style={{ ...webStyles.sectionLabel, marginTop: 8 }}>Area sensors & photocells</div>
              <div style={webStyles.installBlock}>
                {areaLevelControls.map(c => (
                  <ControlStatusLine key={c.id} control={c} status={getControlStatus(c)} onStatus={s => updateControlStatus(c.id, s)} />
                ))}
              </div>
            </>
          )}

          <div style={webStyles.divider} />

          {/* Follow-up flag */}
          <div
            style={{
              ...webStyles.followUpRow,
              background: needsFollowUp ? '#FAECE7' : '#fff',
              border: `1px solid ${needsFollowUp ? Colors.coral : '#e0e7ef'}`,
            }}
            onClick={() => setNeedsFollowUp(!needsFollowUp)}
          >
            <div>
              <div style={webStyles.followUpLabel}>Flag for follow-up</div>
              <div style={webStyles.followUpSub}>Notify owner this area needs another visit</div>
            </div>
            <div style={{
              ...webStyles.toggle,
              background: needsFollowUp ? Colors.coral : '#ccc',
            }}>
              <div style={{
                ...webStyles.toggleThumb,
                transform: needsFollowUp ? 'translateX(16px)' : 'translateX(0)',
              }} />
            </div>
          </div>

          <div style={webStyles.divider} />
          <button
            style={{ ...webStyles.layoutBtn, color: '#712B13', border: '0.5px dashed #D08A6E' }}
            onClick={() => router.push(`/job-issues?jobId=${jobId}&areaId=${areaId}` as any)}
          >
            ⚠️ Log an issue (bad light, change…)
          </button>

          {/* Layout link */}
          {job?.col_layout && (
            <>
              <div style={webStyles.divider} />
              <button
                style={webStyles.layoutBtn}
                onClick={() => router.push(`/layout-canvas?areaId=${areaId}&jobId=${jobId}&areaName=${area?.name}`)}
              >
                🗺 View ceiling layout
              </button>
            </>
          )}

          <div style={webStyles.divider} />

          {/* Notes */}
          <div style={webStyles.sectionLabel}>Install notes</div>
          <textarea
            style={webStyles.notesInput}
            rows={3}
            placeholder="Add install notes for this area..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          {/* Save */}
          <button
            style={{ ...webStyles.saveBtn, opacity: saving ? 0.6 : 1 }}
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving...' : isOnlineStatus ? 'Save progress' : 'Save offline'}
          </button>

          {!isOnlineStatus && (
            <div style={webStyles.offlineNote}>
              ⚠️ You&apos;re offline — changes will sync automatically when connection is restored
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
  controlBlock: { padding: '10px 16px', borderTop: '0.5px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 8 },
  controlText: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 700, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary, whiteSpace: 'nowrap' },
  headerTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  headerSub: { fontSize: 13, color: Colors.textTertiary },
  onlineBadge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: '500' },
  modeBadge: { display: 'inline-block', fontSize: 11, padding: '3px 12px', borderRadius: 20, background: '#FAECE7', color: '#712B13', fontWeight: '500', marginBottom: 16 },
  refPanel: { background: '#fff', borderRadius: 12, padding: '14px 18px', border: '0.5px solid #e0e7ef', marginBottom: 16 },
  refLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 },
  refRow: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  refKey: { fontSize: 13, color: Colors.textSecondary, whiteSpace: 'nowrap' },
  refVal: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  card: { background: '#fff', borderRadius: 16, padding: '24px 28px', border: '0.5px solid #e0e7ef', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  sectionLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 },
  emptyState: { padding: 24, textAlign: 'center', color: Colors.textTertiary, fontSize: 13, border: '0.5px dashed #e0e7ef', borderRadius: 10, marginBottom: 16 },
  installBlock: { border: '0.5px solid #e0e7ef', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  installTop: { padding: '12px 16px', borderBottom: '0.5px solid #f5f5f5' },
  installType: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  installQty: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  statusPills: { display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '0.5px solid #f5f5f5' },
  statusPill: { flex: 1, textAlign: 'center', padding: '7px 0', fontSize: 12, borderRadius: 8, borderWidth: 0.5, borderStyle: 'solid', borderColor: '#e0e7ef', cursor: 'pointer', color: Colors.textSecondary },
  removedRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', cursor: 'pointer' },
  removedLabel: { fontSize: 13, color: Colors.textSecondary },
  toggle: { width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 },
  toggleThumb: { position: 'absolute', top: 3, left: 3, width: 14, height: 14, borderRadius: 7, background: '#fff', transition: 'transform 0.2s' },
  removalExpand: { background: '#FAECE7', padding: '10px 16px', borderTop: '0.5px solid #D08A6E' },
  removalLabel: { fontSize: 10, color: '#712B13', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  removalInput: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13, border: '0.5px solid #D08A6E', borderRadius: 8, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#4A1F11', resize: 'none' },
  divider: { borderTop: '0.5px solid #f0f0f0', margin: '20px 0' },
  followUpRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 12, cursor: 'pointer', marginBottom: 8 },
  followUpLabel: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  followUpSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  layoutBtn: { width: '100%', padding: '11px', background: 'transparent', border: '0.5px dashed #AFA9EC', borderRadius: 10, fontSize: 13, color: '#534AB7', cursor: 'pointer', marginBottom: 4 },
  notesInput: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 13, border: '0.5px solid #e0e7ef', borderRadius: 8, outline: 'none', fontFamily: 'inherit', resize: 'vertical', marginTop: 8 },
  saveBtn: { width: '100%', padding: '13px', background: Colors.coral, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: '500', cursor: 'pointer', marginTop: 20 },
  offlineNote: { marginTop: 10, fontSize: 12, color: '#854F0B', textAlign: 'center', padding: '8px', background: '#FAEEDA', borderRadius: 8 },
};
