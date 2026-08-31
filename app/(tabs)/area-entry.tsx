import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView, ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../supabase';

const LUMEN_OPTIONS = ['L', 'M', 'H', '3500K', '4000K', '5000K'];
const SENSOR_TYPES = ['Ceiling PIR', 'Wall PIR', 'Ceiling dual-tech', 'Ultrasonic'];

export default function AreaEntryScreen() {
  const { areaId, jobId } = useLocalSearchParams();
  const [area, setArea] = useState(null);
  const [job, setJob] = useState(null);
  const [rows, setRows] = useState([{
    id: null,
    oldQty: '', oldType: '',
    newQty: '', newType: '',
    lumenSetting: '',
    hoursOn: false, hoursStart: '06:00', hoursEnd: '18:00',
    removedOnly: false,
    newAddition: false,
    sensorQty: '', sensorType: '',
  }]);
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [lightTypes, setLightTypes] = useState({ current: [], new: [] });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState({ rowIndex: 0, field: 'oldType' });
  const [webPickerVisible, setWebPickerVisible] = useState(false);
  const [webPickerTarget, setWebPickerTarget] = useState({ rowIndex: 0, field: 'oldType' });
  const [webSearch, setWebSearch] = useState('');

  useEffect(() => {
    setRows([{
      id: null, oldQty: '', oldType: '',
      newQty: '', newType: '',
      lumenSetting: '', hoursOn: false,
      hoursStart: '06:00', hoursEnd: '18:00',
      removedOnly: false, newAddition: false,
      sensorQty: '', sensorType: '',
    }]);
    setNotes('');
    setIsComplete(false);
    setLoading(true);
    loadAll();
  }, [areaId]);

  async function loadAll() {
    await Promise.all([loadArea(), loadJob(), loadLightTypes(), loadExistingRows()]);
    setLoading(false);
  }

  async function loadArea() {
    const { data } = await supabase.from('areas').select('*').eq('id', areaId).single();
    if (data) { setArea(data); setNotes(data.notes || ''); setIsComplete(data.is_complete); }
  }

  async function loadJob() {
    const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single();
    if (data) setJob(data);
  }

  async function loadLightTypes() {
    const { data } = await supabase.from('light_types').select('*').order('sort_order');
    if (data) {
      setLightTypes({
        current: data.filter(t => t.category === 'current').map(t => t.name),
        new: data.filter(t => t.category === 'new').map(t => t.name),
      });
    }
  }

  async function loadExistingRows() {
    const { data } = await supabase
      .from('light_rows')
      .select('*')
      .eq('area_id', areaId)
      .order('sort_order');
    if (data && data.length > 0) {
      const mapped = data.map(r => ({
        id: r.id,
        oldQty: String(r.quantity || ''),
        oldType: r.light_type_id || '',
        newQty: String(r.new_quantity || ''),
        newType: r.new_light_type || '',
        lumenSetting: r.lumen_setting || '',
        hoursOn: r.hours_flagged || false,
        hoursStart: r.hours_start || '06:00',
        hoursEnd: r.hours_end || '18:00',
        removedOnly: r.removed_only || false,
        newAddition: r.new_addition || false,
        sensorQty: '',
        sensorType: '',
      }));
      setRows(mapped);
    }
  }

  async function save(markComplete = false) {
    setSaving(true);
    await supabase.from('areas').update({
      notes,
      is_complete: markComplete ? true : isComplete,
    }).eq('id', areaId);

    await supabase.from('light_rows').delete().eq('area_id', areaId);

    const dbRows = rows.map((r, i) => ({
      area_id: areaId,
      section: 'current',
      quantity: parseInt(r.oldQty) || 0,
      light_type_id: r.oldType || null,
      new_quantity: parseInt(r.newQty) || 0,
      new_light_type: r.newType || null,
      lumen_setting: r.lumenSetting || null,
      hours_flagged: r.hoursOn,
      hours_start: r.hoursOn ? r.hoursStart : null,
      hours_end: r.hoursOn ? r.hoursEnd : null,
      removed_only: r.removedOnly,
      new_addition: r.newAddition,
      sort_order: i,
    }));

    await supabase.from('light_rows').insert(dbRows);
    setSaving(false);
    if (markComplete) setIsComplete(true);
  }

  function addRow() {
    setRows([...rows, {
      id: null, oldQty: '', oldType: '',
      newQty: '', newType: '',
      lumenSetting: '', hoursOn: false,
      hoursStart: '06:00', hoursEnd: '18:00',
      removedOnly: false, newAddition: false,
      sensorQty: '', sensorType: '',
    }]);
  }

  function removeRow(index) {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== index));
  }

  function updateRow(index, field, value) {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'removedOnly' && value) updated[index].newAddition = false;
    if (field === 'newAddition' && value) updated[index].removedOnly = false;
    setRows(updated);
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  // ── MOBILE PICKER MODAL ──────────────────────────────────
  const TypePickerModal = () => {
    const [search, setSearch] = useState('');
    const options = pickerTarget.field === 'oldType' ? lightTypes.current : lightTypes.new;
    const filtered = options.filter(t => t.toLowerCase().includes(search.toLowerCase()));

    return (
      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setPickerVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : 'height'}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {pickerTarget.field === 'oldType' ? 'Current light type' : 'New light type'}
                </Text>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalSearchWrap}>
                <Text style={styles.modalSearchIcon}>🔍</Text>
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search..."
                  placeholderTextColor={Colors.textTertiary}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                  clearButtonMode="while-editing"
                />
              </View>
              <FlatList
                data={filtered}
                keyExtractor={item => item}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 220 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      updateRow(pickerTarget.rowIndex, pickerTarget.field, item);
                      setPickerVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Text style={styles.modalEmptyText}>No results for "{search}"</Text>
                  </View>
                }
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  };

  // ── WEB PICKER MODAL ─────────────────────────────────────
  const WebTypePickerModal = () => {
    const options = webPickerTarget.field === 'oldType' ? lightTypes.current : lightTypes.new;
    const filtered = options.filter(t => t.toLowerCase().includes(webSearch.toLowerCase()));
    if (!webPickerVisible) return null;
    return (
      <div style={webStyles.modalOverlay} onClick={() => { setWebPickerVisible(false); setWebSearch(''); }}>
        <div style={webStyles.modalCard} onClick={e => e.stopPropagation()}>
          <div style={webStyles.modalHeader}>
            <div style={webStyles.modalTitle}>
              {webPickerTarget.field === 'oldType' ? 'Current light type' : 'New light type'}
            </div>
            <button style={webStyles.modalClose} onClick={() => { setWebPickerVisible(false); setWebSearch(''); }}>✕</button>
          </div>
          <div style={webStyles.modalSearchWrap}>
            <span style={{ fontSize: 14, marginRight: 8 }}>🔍</span>
            <input
              autoFocus
              style={webStyles.modalSearchInput}
              placeholder="Search light types..."
              value={webSearch}
              onChange={e => setWebSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && filtered.length === 1) {
                  updateRow(webPickerTarget.rowIndex, webPickerTarget.field, filtered[0]);
                  setWebPickerVisible(false); setWebSearch('');
                }
                if (e.key === 'Escape') { setWebPickerVisible(false); setWebSearch(''); }
              }}
            />
          </div>
          <div style={webStyles.modalList}>
            {filtered.length === 0 ? (
              <div style={webStyles.modalEmpty}>No results for "{webSearch}"</div>
            ) : filtered.map(item => (
              <div
                key={item}
                style={webStyles.modalItem}
                onClick={() => {
                  updateRow(webPickerTarget.rowIndex, webPickerTarget.field, item);
                  setWebPickerVisible(false); setWebSearch('');
                }}
                onMouseEnter={e => e.currentTarget.style.background = Colors.bgSecondary}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── WEB VERSION ──────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.page}>
        <WebTypePickerModal />
        <div style={webStyles.container}>
          <div style={webStyles.header}>
            <button style={webStyles.backBtn} onClick={() => router.push(`/area-list?jobId=${jobId}`)}>
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
                      setWebPickerTarget({ rowIndex: i, field: 'oldType' });
                      setWebPickerVisible(true); setWebSearch('');
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
                      setWebPickerTarget({ rowIndex: i, field: 'newType' });
                      setWebPickerVisible(true); setWebSearch('');
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
                  onClick={() => router.push(`/layout-canvas?areaId=${areaId}&jobId=${jobId}&areaName=${area?.name}`)}
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

  // ── MOBILE VERSION ───────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <TypePickerModal />
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(`/area-list?jobId=${jobId}`)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{area?.name}</Text>
          <View style={{ width: 50 }} />
        </View>

        <Text style={styles.sectionLabel}>Light replacements</Text>

        {rows.map((row, i) => (
          <View key={i} style={styles.rowBlock}>
            {/* Old side */}
            {!row.newAddition && (
              <View style={styles.rowSection}>
                <Text style={styles.rowSectionLabel}>Current</Text>
                <View style={styles.rowInputLine}>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="numeric"
                    value={row.oldQty}
                    onChangeText={v => updateRow(i, 'oldQty', v)}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <TouchableOpacity
                    style={styles.typePickerWrap}
                    onPress={() => { setPickerTarget({ rowIndex: i, field: 'oldType' }); setPickerVisible(true); }}
                  >
                    <Text style={[styles.typeText, row.oldType && { color: Colors.textPrimary }]} numberOfLines={1}>
                      {row.oldType || 'Select type...'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!row.newAddition && !row.removedOnly && (
              <View style={styles.arrowRow}>
                <Text style={styles.arrowText}>↓ replaced by</Text>
              </View>
            )}

            {row.removedOnly && (
              <View style={styles.arrowRow}>
                <Text style={[styles.arrowText, { color: Colors.coral }]}>↓ removed, not replaced</Text>
              </View>
            )}

            {/* New side */}
            {!row.removedOnly && (
              <View style={styles.rowSection}>
                <Text style={styles.rowSectionLabel}>New</Text>
                <View style={styles.rowInputLine}>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="numeric"
                    value={row.newQty}
                    onChangeText={v => updateRow(i, 'newQty', v)}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <TouchableOpacity
                    style={styles.typePickerWrap}
                    onPress={() => { setPickerTarget({ rowIndex: i, field: 'newType' }); setPickerVisible(true); }}
                  >
                    <Text style={[styles.typeText, row.newType && { color: Colors.textPrimary }]} numberOfLines={1}>
                      {row.newType || 'Select type...'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Flags */}
            <View style={styles.flagsRow}>
              <TouchableOpacity
                style={[styles.flagBtn, row.removedOnly && styles.flagBtnActive]}
                onPress={() => updateRow(i, 'removedOnly', !row.removedOnly)}
              >
                <Text style={[styles.flagBtnText, row.removedOnly && { color: Colors.coral }]}>
                  Removed only
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.flagBtn, row.newAddition && styles.flagBtnActive]}
                onPress={() => updateRow(i, 'newAddition', !row.newAddition)}
              >
                <Text style={[styles.flagBtnText, row.newAddition && { color: Colors.blue }]}>
                  New addition
                </Text>
              </TouchableOpacity>
              {job?.col_hours && (
                <TouchableOpacity
                  style={[styles.flagBtn, row.hoursOn && { borderColor: '#EF9F27', backgroundColor: '#FAEEDA' }]}
                  onPress={() => updateRow(i, 'hoursOn', !row.hoursOn)}
                >
                  <Text style={[styles.flagBtnText, row.hoursOn && { color: '#854F0B' }]}>⏱ Hours</Text>
                </TouchableOpacity>
              )}
            </View>

            {row.hoursOn && job?.col_hours && (
              <View style={styles.hoursExpand}>
                <Text style={styles.hoursLabel}>Operating hours</Text>
                <View style={styles.hoursRow}>
                  <TextInput style={styles.timeInput} value={row.hoursStart} onChangeText={v => updateRow(i, 'hoursStart', v)} placeholder="06:00" placeholderTextColor={Colors.textTertiary} />
                  <Text style={styles.timeSep}>to</Text>
                  <TextInput style={styles.timeInput} value={row.hoursEnd} onChangeText={v => updateRow(i, 'hoursEnd', v)} placeholder="18:00" placeholderTextColor={Colors.textTertiary} />
                </View>
              </View>
            )}

            {/* Remove row button */}
            {rows.length > 1 && (
              <TouchableOpacity style={styles.removeRowBtn} onPress={() => removeRow(i)}>
                <Text style={styles.removeRowBtnText}>Remove row</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
          <Text style={styles.addRowBtnText}>+ Add light row</Text>
        </TouchableOpacity>

        {job?.col_layout && (
          <TouchableOpacity
            style={styles.layoutBtn}
            onPress={() => router.push(`/layout-canvas?areaId=${areaId}&jobId=${jobId}&areaName=${area?.name}`)}
          >
            <Text style={styles.layoutBtnText}>🗺 Open ceiling layout</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          numberOfLines={3}
          placeholder="Add any notes about this area..."
          placeholderTextColor={Colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={() => save(false)} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.doneBtn, isComplete && styles.doneBtnActive]} onPress={() => save(true)} disabled={saving}>
          <Text style={[styles.doneBtnText, isComplete && { color: Colors.green }]}>
            {isComplete ? '✓ Area complete' : 'Mark as complete'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const webStyles = {
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
  clockBtn: { width: 34, height: 34, borderRadius: 8, border: '0.5px solid #e0e7ef', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, flexShrink: 0 },
  clockBtnOn: { background: '#FAEEDA', borderColor: '#EF9F27' },
  delBtn: { width: 28, height: 28, borderRadius: 14, border: '0.5px solid #e0e7ef', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: '#aaa', flexShrink: 0 },
  hoursExpand: { background: '#FAEEDA', borderRadius: 8, padding: '8px 12px', marginBottom: 4 },
  hoursLabel: { fontSize: 10, color: '#854F0B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  hoursRow: { display: 'flex', alignItems: 'center', gap: 8 },
  timeInput: { padding: '6px 8px', fontSize: 13, border: '0.5px solid #EF9F27', borderRadius: 6, outline: 'none', background: '#fff', color: '#412402' },
  flagsRow: { display: 'flex', gap: 16, alignItems: 'center', padding: '4px 0', marginBottom: 8 },
  flagLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: Colors.textSecondary, cursor: 'pointer' },
  addRowBtn: { width: '100%', padding: '9px', background: 'transparent', border: '0.5px dashed #c0cfe0', borderRadius: 8, fontSize: 12, color: Colors.blue, cursor: 'pointer', marginBottom: 4 },
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { padding: 20, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { fontSize: 14, color: Colors.blue },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  sectionLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  rowBlock: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: Colors.borderLight, padding: 14, marginBottom: 10 },
  rowSection: { marginBottom: 6 },
  rowSectionLabel: { fontSize: 10, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  rowInputLine: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  qtyInput: { width: 60, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 8, padding: 8, fontSize: 13, color: Colors.textPrimary, textAlign: 'center', backgroundColor: Colors.bgSecondary },
  typePickerWrap: { flex: 1, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 8, padding: 10, backgroundColor: Colors.bgSecondary, justifyContent: 'center', minHeight: 40 },
  typeText: { fontSize: 12, color: Colors.textTertiary },
  arrowRow: { alignItems: 'center', paddingVertical: 4 },
  arrowText: { fontSize: 12, color: Colors.textTertiary },
  flagsRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  flagBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.borderLight, backgroundColor: Colors.bgSecondary },
  flagBtnActive: { borderColor: Colors.coral, backgroundColor: '#FAECE7' },
  flagBtnText: { fontSize: 11, color: Colors.textSecondary },
  hoursExpand: { backgroundColor: '#FAEEDA', padding: 10, borderRadius: 8, marginTop: 8 },
  hoursLabel: { fontSize: 10, color: '#854F0B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { borderWidth: 0.5, borderColor: '#EF9F27', borderRadius: 6, padding: 6, fontSize: 12, color: '#412402', backgroundColor: '#fff', width: 80 },
  timeSep: { fontSize: 12, color: '#854F0B' },
  removeRowBtn: { marginTop: 8, alignItems: 'center', padding: 6 },
  removeRowBtnText: { fontSize: 12, color: '#A32D2D' },
  addRowBtn: { borderWidth: 1, borderColor: '#c0cfe0', borderStyle: 'dashed', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 10 },
  addRowBtnText: { fontSize: 12, color: Colors.blue },
  layoutBtn: { borderWidth: 1, borderColor: '#AFA9EC', borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 10 },
  layoutBtnText: { fontSize: 13, color: '#534AB7' },
  divider: { height: 0.5, backgroundColor: Colors.borderLight, marginVertical: 16 },
  notesInput: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 10, padding: 12, fontSize: 13, color: Colors.textPrimary, minHeight: 80, marginTop: 8 },
  saveBtn: { backgroundColor: Colors.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  doneBtn: { borderWidth: 0.5, borderColor: Colors.green, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8, backgroundColor: '#fff' },
  doneBtnActive: { backgroundColor: '#E1F5EE' },
  doneBtnText: { fontSize: 14, color: Colors.teal },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  modalTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  modalClose: { fontSize: 14, color: Colors.blue, fontWeight: '500' },
  modalSearchWrap: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight, backgroundColor: Colors.bgSecondary },
  modalSearchIcon: { fontSize: 14, marginRight: 8 },
  modalSearchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, padding: 0 },
  modalItem: { padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  modalItemText: { fontSize: 14, color: Colors.textPrimary },
  modalEmpty: { padding: 32, alignItems: 'center' },
  modalEmptyText: { fontSize: 14, color: Colors.textTertiary },
});