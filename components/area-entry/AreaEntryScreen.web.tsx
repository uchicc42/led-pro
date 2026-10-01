import { router } from 'expo-router';
import { useState, type CSSProperties } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { AreaEntryState, LUMEN_OPTIONS, PickerTarget, useAreaEntry } from './useAreaEntry';

// Web-only UI built with DOM elements. Metro only bundles this file for web; native uses AreaEntryScreen.tsx.

type WebTypePickerModalProps = {
  target: PickerTarget;
  lightTypes: AreaEntryState['lightTypes'];
  onSelect: (item: string) => void;
  onClose: () => void;
};

function WebTypePickerModal({ target, lightTypes, onSelect, onClose }: WebTypePickerModalProps) {
  const [search, setSearch] = useState('');
  const options = target.field === 'oldType' ? lightTypes.current : lightTypes.new;
  const filtered = options.filter(t => t.toLowerCase().includes(search.toLowerCase()));

  function pick(item: string) {
    onSelect(item);
    onClose();
  }

  return (
    <div style={webStyles.modalOverlay} onClick={onClose}>
      <div style={webStyles.modalCard} onClick={e => e.stopPropagation()}>
        <div style={webStyles.modalHeader}>
          <div style={webStyles.modalTitle}>
            {target.field === 'oldType' ? 'Current light type' : 'New light type'}
          </div>
          <button style={webStyles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div style={webStyles.modalSearchWrap}>
          <span style={{ fontSize: 14, marginRight: 8 }}>🔍</span>
          <input
            autoFocus
            style={webStyles.modalSearchInput}
            placeholder="Search light types..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && filtered.length === 1) pick(filtered[0]);
              if (e.key === 'Escape') onClose();
            }}
          />
        </div>
        <div style={webStyles.modalList}>
          {filtered.length === 0 ? (
            <div style={webStyles.modalEmpty}>No results for &quot;{search}&quot;</div>
          ) : filtered.map(item => (
            <div
              key={item}
              style={webStyles.modalItem}
              onClick={() => pick(item)}
              onMouseEnter={e => { e.currentTarget.style.background = Colors.bgSecondary; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AreaEntryScreen() {
  const {
    area, job, rows, notes, setNotes, isComplete, lightTypes, saving, loading,
    save, addRow, removeRow, updateRow, backToAreaList, layoutCanvasHref,
  } = useAreaEntry();
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  return (
    <div style={webStyles.page}>
      {pickerTarget && (
        <WebTypePickerModal
          target={pickerTarget}
          lightTypes={lightTypes}
          onSelect={item => updateRow(pickerTarget.rowIndex, pickerTarget.field, item)}
          onClose={() => setPickerTarget(null)}
        />
      )}
      <div style={webStyles.container}>
        <div style={webStyles.header}>
          <button style={webStyles.backBtn} onClick={() => router.push(backToAreaList as any)}>
            ← Back
          </button>
          <div>
            <div style={webStyles.headerTitle}>{area?.name}</div>
            <div style={webStyles.headerSub}>{job?.name}</div>
          </div>
        </div>

        <div style={webStyles.card}>
          {/* Column headers */}
          <div style={webStyles.colHeaderRow}>
            <div style={{ ...webStyles.colHeader, width: 60 }}>Old qty</div>
            <div style={{ ...webStyles.colHeader, flex: 1 }}>Current light type</div>
            <div style={{ ...webStyles.colHeader, width: 60 }}>New qty</div>
            <div style={{ ...webStyles.colHeader, flex: 1 }}>New light type</div>
            {job?.col_hours && <div style={{ ...webStyles.colHeader, width: 36 }}>⏱</div>}
            {job?.col_sensor && <div style={{ ...webStyles.colHeader, width: 60 }}>Sensor</div>}
            <div style={{ ...webStyles.colHeader, width: 80 }}>Lumen</div>
            <div style={{ width: 28 }}></div>
          </div>

          {rows.map((row, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={webStyles.pairedRow}>
                {/* Old qty */}
                <input
                  style={{ ...webStyles.qtyInput, opacity: row.newAddition ? 0.3 : 1 }}
                  type="number" min="0"
                  value={row.oldQty}
                  disabled={row.newAddition}
                  onChange={e => updateRow(i, 'oldQty', e.target.value)}
                  placeholder="0"
                />

                {/* Old type */}
                <div
                  style={{
                    ...webStyles.typeBtn,
                    flex: 1,
                    opacity: row.newAddition ? 0.3 : 1,
                    cursor: row.newAddition ? 'not-allowed' : 'pointer',
                    color: row.oldType ? Colors.textPrimary : '#aaa',
                  }}
                  onClick={() => {
                    if (row.newAddition) return;
                    setPickerTarget({ rowIndex: i, field: 'oldType' });
                  }}
                >
                  {row.oldType || 'Select...'}
                </div>

                <div style={webStyles.arrow}>→</div>

                {/* New qty */}
                <input
                  style={{ ...webStyles.qtyInput, opacity: row.removedOnly ? 0.3 : 1 }}
                  type="number" min="0"
                  value={row.newQty}
                  disabled={row.removedOnly}
                  onChange={e => updateRow(i, 'newQty', e.target.value)}
                  placeholder="0"
                />

                {/* New type */}
                <div
                  style={{
                    ...webStyles.typeBtn,
                    flex: 1,
                    opacity: row.removedOnly ? 0.3 : 1,
                    cursor: row.removedOnly ? 'not-allowed' : 'pointer',
                    color: row.newType ? Colors.textPrimary : '#aaa',
                  }}
                  onClick={() => {
                    if (row.removedOnly) return;
                    setPickerTarget({ rowIndex: i, field: 'newType' });
                  }}
                >
                  {row.newType || 'Select...'}
                </div>

                {/* Hours flag */}
                {job?.col_hours && (
                  <div
                    style={{ ...webStyles.clockBtn, ...(row.hoursOn ? webStyles.clockBtnOn : {}) }}
                    onClick={() => updateRow(i, 'hoursOn', !row.hoursOn)}
                    title="Set operating hours"
                  >⏱</div>
                )}

                {/* Sensor qty */}
                {job?.col_sensor && (
                  <input
                    style={{ ...webStyles.qtyInput, width: 60 }}
                    type="number" min="0"
                    value={row.sensorQty}
                    onChange={e => updateRow(i, 'sensorQty', e.target.value)}
                    placeholder="0"
                    title="Sensor qty"
                  />
                )}

                {/* Lumen setting */}
                <select
                  style={webStyles.lumenSelect}
                  value={row.lumenSetting}
                  onChange={e => updateRow(i, 'lumenSetting', e.target.value)}
                >
                  <option value="">—</option>
                  {LUMEN_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>

                {/* Delete row */}
                <div style={webStyles.delBtn} onClick={() => removeRow(i)}>✕</div>
              </div>

              {/* Hours expand */}
              {row.hoursOn && job?.col_hours && (
                <div style={webStyles.hoursExpand}>
                  <div style={webStyles.hoursLabel}>Operating hours</div>
                  <div style={webStyles.hoursRow}>
                    <input type="time" style={webStyles.timeInput} value={row.hoursStart} onChange={e => updateRow(i, 'hoursStart', e.target.value)} />
                    <span style={{ color: '#854F0B', fontSize: 12 }}>to</span>
                    <input type="time" style={webStyles.timeInput} value={row.hoursEnd} onChange={e => updateRow(i, 'hoursEnd', e.target.value)} />
                  </div>
                </div>
              )}

              {/* Flags row */}
              <div style={webStyles.flagsRow}>
                <label style={webStyles.flagLabel}>
                  <input
                    type="checkbox"
                    checked={row.removedOnly}
                    onChange={e => updateRow(i, 'removedOnly', e.target.checked)}
                  />
                  <span>Removed, no replacement</span>
                </label>
                <label style={webStyles.flagLabel}>
                  <input
                    type="checkbox"
                    checked={row.newAddition}
                    onChange={e => updateRow(i, 'newAddition', e.target.checked)}
                  />
                  <span>New addition (no removal)</span>
                </label>
              </div>
            </div>
          ))}

          <button style={webStyles.addRowBtn} onClick={addRow}>+ Add light row</button>

          <div style={webStyles.divider} />

          {/* Layout link */}
          {job?.col_layout && (
            <>
              <div style={webStyles.sectionLabel}>Layout / exhibit</div>
              <button
                style={{ ...webStyles.addRowBtn, color: '#534AB7', borderColor: '#534AB7', marginBottom: 16 }}
                onClick={() => router.push(layoutCanvasHref as any)}
              >
                🗺 Open ceiling layout canvas
              </button>
            </>
          )}

          <div style={webStyles.sectionLabel}>Notes</div>
          <textarea
            style={webStyles.notesInput}
            rows={3}
            placeholder="Add any notes about this area..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <div style={webStyles.actionRow}>
            <button style={{ ...webStyles.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={() => save(false)} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button style={{ ...webStyles.doneBtn, ...(isComplete ? webStyles.doneBtnActive : {}) }} onClick={() => save(true)} disabled={saving}>
              {isComplete ? '✓ Area complete' : 'Mark as complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: Colors.bgSecondary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowY: 'auto' },
  container: { maxWidth: 900, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary, whiteSpace: 'nowrap' },
  headerTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  card: { background: '#fff', borderRadius: 16, padding: '28px 32px', border: '0.5px solid #e0e7ef', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  colHeaderRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: '0.5px solid #f0f0f0' },
  colHeader: { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' },
  pairedRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 },
  qtyInput: { width: 60, padding: '8px 6px', fontSize: 13, border: '0.5px solid #e0e7ef', borderRadius: 8, textAlign: 'center', outline: 'none', flexShrink: 0 },
  typeBtn: { padding: '8px 10px', fontSize: 13, border: '0.5px solid #e0e7ef', borderRadius: 8, cursor: 'pointer', background: '#fff', minWidth: 120 },
  arrow: { fontSize: 16, color: '#aaa', flexShrink: 0 },
  lumenSelect: { width: 80, padding: '8px 6px', fontSize: 12, border: '0.5px solid #e0e7ef', borderRadius: 8, outline: 'none', background: '#fff', flexShrink: 0 },
  clockBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 0.5, borderStyle: 'solid', borderColor: '#e0e7ef', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, flexShrink: 0 },
  clockBtnOn: { background: '#FAEEDA', borderColor: '#EF9F27' },
  delBtn: { width: 28, height: 28, borderRadius: 14, border: '0.5px solid #e0e7ef', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: '#aaa', flexShrink: 0 },
  hoursExpand: { background: '#FAEEDA', borderRadius: 8, padding: '8px 12px', marginBottom: 4 },
  hoursLabel: { fontSize: 10, color: '#854F0B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  hoursRow: { display: 'flex', alignItems: 'center', gap: 8 },
  timeInput: { padding: '6px 8px', fontSize: 13, border: '0.5px solid #EF9F27', borderRadius: 6, outline: 'none', background: '#fff', color: '#412402' },
  flagsRow: { display: 'flex', gap: 16, alignItems: 'center', padding: '4px 0', marginBottom: 8 },
  flagLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: Colors.textSecondary, cursor: 'pointer' },
  addRowBtn: { width: '100%', padding: '9px', background: 'transparent', borderWidth: 0.5, borderStyle: 'dashed', borderColor: '#c0cfe0', borderRadius: 8, fontSize: 12, color: Colors.blue, cursor: 'pointer', marginBottom: 4 },
  divider: { borderTop: '0.5px solid #f0f0f0', margin: '20px 0' },
  sectionLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 },
  notesInput: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 13, border: '0.5px solid #e0e7ef', borderRadius: 8, outline: 'none', fontFamily: 'inherit', resize: 'vertical', marginTop: 8 },
  actionRow: { display: 'flex', gap: 10, marginTop: 20 },
  saveBtn: { flex: 1, padding: '13px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: '500', cursor: 'pointer' },
  doneBtn: { flex: 1, padding: '13px', background: '#fff', color: Colors.teal, border: `1px solid ${Colors.green}`, borderRadius: 10, fontSize: 14, cursor: 'pointer' },
  doneBtnActive: { background: '#E1F5EE', color: Colors.green },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#fff', borderRadius: 16, width: 420, maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '0.5px solid #f0f0f0' },
  modalTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  modalClose: { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: Colors.textTertiary, padding: 4 },
  modalSearchWrap: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid #f0f0f0', background: Colors.bgSecondary },
  modalSearchInput: { flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: Colors.textPrimary, fontFamily: 'inherit' },
  modalList: { overflowY: 'auto', flex: 1 },
  modalItem: { padding: '13px 20px', fontSize: 14, color: Colors.textPrimary, cursor: 'pointer', borderBottom: '0.5px solid #f9f9f9', background: '#fff' },
  modalEmpty: { padding: 32, textAlign: 'center', color: Colors.textTertiary, fontSize: 14 },
};
