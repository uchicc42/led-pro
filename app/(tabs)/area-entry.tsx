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

export default function AreaEntryScreen() {
  const { areaId, jobId } = useLocalSearchParams();
  const [area, setArea] = useState(null);
  const [job, setJob] = useState(null);
  const [currentLights, setCurrentLights] = useState([{ qty: '', type: '', hoursOn: false, hoursStart: '06:00', hoursEnd: '18:00' }]);
  const [newLights, setNewLights] = useState([{ qty: '', type: '', hoursOn: false, hoursStart: '06:00', hoursEnd: '18:00' }]);
  const [sensorQty, setSensorQty] = useState('');
  const [sensorType, setSensorType] = useState('');
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [lightTypes, setLightTypes] = useState({ current: [], new: [] });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState({ section: 'current', index: 0 });
  const [webPickerVisible, setWebPickerVisible] = useState(false);
  const [webPickerTarget, setWebPickerTarget] = useState({ section: 'current', index: 0 });
  const [webSearch, setWebSearch] = useState('');

  useEffect(() => {
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
      const cur = data.filter(r => r.section === 'current').map(r => ({
        qty: String(r.quantity), type: r.light_type_id || '',
        hoursOn: r.hours_flagged, hoursStart: r.hours_start || '06:00',
        hoursEnd: r.hours_end || '18:00', id: r.id,
      }));
      const nw = data.filter(r => r.section === 'new').map(r => ({
        qty: String(r.quantity), type: r.light_type_id || '',
        hoursOn: r.hours_flagged, hoursStart: r.hours_start || '06:00',
        hoursEnd: r.hours_end || '18:00', id: r.id,
      }));
      if (cur.length > 0) setCurrentLights(cur);
      if (nw.length > 0) setNewLights(nw);
    }
  }

  async function save(markComplete = false) {
    setSaving(true);
    await supabase.from('areas').update({
      notes,
      is_complete: markComplete ? true : isComplete,
    }).eq('id', areaId);

    await supabase.from('light_rows').delete().eq('area_id', areaId);

    const rows = [
      ...currentLights.map((r, i) => ({
        area_id: areaId, section: 'current', quantity: parseInt(r.qty) || 0,
        light_type_id: r.type || null, hours_flagged: r.hoursOn,
        hours_start: r.hoursOn ? r.hoursStart : null,
        hours_end: r.hoursOn ? r.hoursEnd : null, sort_order: i,
      })),
      ...newLights.map((r, i) => ({
        area_id: areaId, section: 'new', quantity: parseInt(r.qty) || 0,
        light_type_id: r.type || null, hours_flagged: r.hoursOn,
        hours_start: r.hoursOn ? r.hoursStart : null,
        hours_end: r.hoursOn ? r.hoursEnd : null, sort_order: i,
      })),
    ];

    await supabase.from('light_rows').insert(rows);
    setSaving(false);
    if (markComplete) setIsComplete(true);
  }

  function addRow(section) {
    const newRow = { qty: '', type: '', hoursOn: false, hoursStart: '06:00', hoursEnd: '18:00' };
    if (section === 'current') setCurrentLights([...currentLights, newRow]);
    else setNewLights([...newLights, newRow]);
  }

  function removeRow(section, index) {
    if (section === 'current') {
      if (currentLights.length <= 1) return;
      setCurrentLights(currentLights.filter((_, i) => i !== index));
    } else {
      if (newLights.length <= 1) return;
      setNewLights(newLights.filter((_, i) => i !== index));
    }
  }

  function updateRow(section, index, field, value) {
    if (section === 'current') {
      const updated = [...currentLights];
      updated[index] = { ...updated[index], [field]: value };
      setCurrentLights(updated);
    } else {
      const updated = [...newLights];
      updated[index] = { ...updated[index], [field]: value };
      setNewLights(updated);
    }
  }

  function getTotal(rows) {
    return rows.reduce((sum, r) => sum + (parseInt(r.qty) || 0), 0);
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );

  const TypePickerModal = () => {
    const [search, setSearch] = useState('');
    const options = pickerTarget.section === 'current' ? lightTypes.current : lightTypes.new;
    const filtered = options.filter(t => t.toLowerCase().includes(search.toLowerCase()));

    return (
      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          {/* Tap outside to close */}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => { setPickerVisible(false); }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'position' : 'height'}
            keyboardVerticalOffset={0}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select light type</Text>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Search bar */}
              <View style={styles.modalSearchWrap}>
                <Text style={styles.modalSearchIcon}>🔍</Text>
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search light types..."
                  placeholderTextColor={Colors.textTertiary}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                  clearButtonMode="while-editing"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (filtered.length === 1) {
                      updateRow(pickerTarget.section, pickerTarget.index, 'type', filtered[0]);
                      setPickerVisible(false);
                    }
                  }}
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
                      updateRow(pickerTarget.section, pickerTarget.index, 'type', item);
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

  const WebTypePickerModal = () => {
    const options = webPickerTarget.section === 'current' ? lightTypes.current : lightTypes.new;
    const filtered = options.filter(t => t.toLowerCase().includes(webSearch.toLowerCase()));

    if (!webPickerVisible) return null;

    return (
      <div style={webStyles.modalOverlay} onClick={() => { setWebPickerVisible(false); setWebSearch(''); }}>
        <div style={webStyles.modalCard} onClick={e => e.stopPropagation()}>
          <div style={webStyles.modalHeader}>
            <div style={webStyles.modalTitle}>Select light type</div>
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
                  updateRow(webPickerTarget.section, webPickerTarget.index, 'type', filtered[0]);
                  setWebPickerVisible(false);
                  setWebSearch('');
                }
                if (e.key === 'Escape') { setWebPickerVisible(false); setWebSearch(''); }
              }}
            />
          </div>
          <div style={webStyles.modalList}>
            {filtered.length === 0 ? (
              <div style={webStyles.modalEmpty}>No results for "{webSearch}"</div>
            ) : (
              filtered.map(item => (
                <div
                  key={item}
                  style={webStyles.modalItem}
                  onClick={() => {
                    updateRow(webPickerTarget.section, webPickerTarget.index, 'type', item);
                    setWebPickerVisible(false);
                    setWebSearch('');
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = Colors.bgSecondary}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  {item}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

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

            {/* CURRENT LIGHTS */}
            <div style={webStyles.sectionHeader}>
              <div style={webStyles.sectionLabel}>Current lights</div>
              <div style={webStyles.totalBadge}>Total: {getTotal(currentLights)}</div>
            </div>
            <div style={webStyles.colHeads}>
              <div style={{ width: 70 }}>Qty</div>
              <div style={{ flex: 1 }}>Type</div>
              <div style={{ width: 40, textAlign: 'center' }}>⏱</div>
              <div style={{ width: 30 }}></div>
            </div>
            {currentLights.map((row, i) => (
              <div key={i}>
                <div style={webStyles.lightRow}>
                  <input
                    style={webStyles.qtyInput}
                    type="number" min="0"
                    value={row.qty}
                    onChange={e => updateRow('current', i, 'qty', e.target.value)}
                    placeholder="0"
                  />
                  <div
                    style={{ ...webStyles.typeSelect, cursor: 'pointer', display: 'flex', alignItems: 'center', color: row.type ? Colors.textPrimary : '#aaa' }}
                    onClick={() => { setWebPickerTarget({ section: 'current', index: i }); setWebPickerVisible(true); setWebSearch(''); }}
                  >
                    {row.type || 'Select type...'}
                  </div>
                  <div
                    style={{ ...webStyles.clockBtn, ...(row.hoursOn ? webStyles.clockBtnOn : {}) }}
                    onClick={() => updateRow('current', i, 'hoursOn', !row.hoursOn)}
                    title="Set operating hours"
                  >⏱</div>
                  <div style={webStyles.delBtn} onClick={() => removeRow('current', i)}>✕</div>
                </div>
                {row.hoursOn && (
                  <div style={webStyles.hoursExpand}>
                    <div style={webStyles.hoursLabel}>Operating hours</div>
                    <div style={webStyles.hoursRow}>
                      <input type="time" style={webStyles.timeInput} value={row.hoursStart} onChange={e => updateRow('current', i, 'hoursStart', e.target.value)} />
                      <span style={{ color: '#854F0B', fontSize: 12 }}>to</span>
                      <input type="time" style={webStyles.timeInput} value={row.hoursEnd} onChange={e => updateRow('current', i, 'hoursEnd', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button style={webStyles.addRowBtn} onClick={() => addRow('current')}>+ Add light type</button>

            <div style={webStyles.divider} />

            {/* NEW LIGHTS */}
            <div style={webStyles.sectionHeader}>
              <div style={webStyles.sectionLabel}>New lights</div>
              <div style={webStyles.totalBadge}>Total: {getTotal(newLights)}</div>
            </div>
            <div style={webStyles.colHeads}>
              <div style={{ width: 70 }}>Qty</div>
              <div style={{ flex: 1 }}>Type</div>
              <div style={{ width: 40, textAlign: 'center' }}>⏱</div>
              <div style={{ width: 30 }}></div>
            </div>
            {newLights.map((row, i) => (
              <div key={i}>
                <div style={webStyles.lightRow}>
                  <input
                    style={webStyles.qtyInput}
                    type="number" min="0"
                    value={row.qty}
                    onChange={e => updateRow('new', i, 'qty', e.target.value)}
                    placeholder="0"
                  />
                  <div
                    style={{ ...webStyles.typeSelect, cursor: 'pointer', display: 'flex', alignItems: 'center', color: row.type ? Colors.textPrimary : '#aaa' }}
                    onClick={() => { setWebPickerTarget({ section: 'new', index: i }); setWebPickerVisible(true); setWebSearch(''); }}
                  >
                    {row.type || 'Select type...'}
                  </div>
                  <div
                    style={{ ...webStyles.clockBtn, ...(row.hoursOn ? webStyles.clockBtnOn : {}) }}
                    onClick={() => updateRow('new', i, 'hoursOn', !row.hoursOn)}
                    title="Set operating hours"
                  >⏱</div>
                  <div style={webStyles.delBtn} onClick={() => removeRow('new', i)}>✕</div>
                </div>
                {row.hoursOn && (
                  <div style={webStyles.hoursExpand}>
                    <div style={webStyles.hoursLabel}>Operating hours</div>
                    <div style={webStyles.hoursRow}>
                      <input type="time" style={webStyles.timeInput} value={row.hoursStart} onChange={e => updateRow('new', i, 'hoursStart', e.target.value)} />
                      <span style={{ color: '#854F0B', fontSize: 12 }}>to</span>
                      <input type="time" style={webStyles.timeInput} value={row.hoursEnd} onChange={e => updateRow('new', i, 'hoursEnd', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button style={webStyles.addRowBtn} onClick={() => addRow('new')}>+ Add light type</button>

            {job?.col_sensor && <>
              <div style={webStyles.divider} />
              <div style={webStyles.sectionLabel}>Occupancy sensor</div>
              <div style={webStyles.lightRow}>
                <input style={webStyles.qtyInput} type="number" min="0" value={sensorQty} onChange={e => setSensorQty(e.target.value)} placeholder="0" />
                <select style={webStyles.typeSelect} value={sensorType} onChange={e => setSensorType(e.target.value)}>
                  <option value="">Select type...</option>
                  <option>Ceiling PIR</option>
                  <option>Wall PIR</option>
                  <option>Ceiling dual-tech</option>
                  <option>Ultrasonic</option>
                </select>
                <div style={{ width: 40 }} />
                <div style={{ width: 30 }} />
              </div>
            </>}

            <div style={webStyles.divider} />

            <div style={webStyles.sectionLabel}>Notes</div>
            <textarea
              style={webStyles.notesInput}
              rows={3}
              placeholder="Add any notes about this area..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            <div style={webStyles.actionRow}>
              <button
                style={{ ...webStyles.saveBtn, opacity: saving ? 0.6 : 1 }}
                onClick={() => save(false)}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                style={{ ...webStyles.doneBtn, ...(isComplete ? webStyles.doneBtnActive : {}) }}
                onClick={() => save(true)}
                disabled={saving}
              >
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

        {/* CURRENT LIGHTS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Current lights</Text>
          <Text style={styles.totalBadge}>Total: {getTotal(currentLights)}</Text>
        </View>
        {currentLights.map((row, i) => (
          <View key={i} style={[styles.lightBlock, row.hoursOn && styles.lightBlockHours]}>
            <View style={styles.lightRow}>
              <TextInput
                style={styles.qtyInput}
                keyboardType="numeric"
                value={row.qty}
                onChangeText={v => updateRow('current', i, 'qty', v)}
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
              />
              <TouchableOpacity
                style={styles.typePickerWrap}
                onPress={() => {
                  setPickerTarget({ section: 'current', index: i });
                  setPickerVisible(true);
                }}
              >
                <Text style={[styles.typeText, row.type && { color: Colors.textPrimary }]} numberOfLines={1}>
                  {row.type || 'Select type...'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.clockBtn, row.hoursOn && styles.clockBtnOn]}
                onPress={() => updateRow('current', i, 'hoursOn', !row.hoursOn)}
              >
                <Text style={{ fontSize: 14 }}>⏱</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => removeRow('current', i)}>
                <Text style={styles.delBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {row.hoursOn && (
              <View style={styles.hoursExpand}>
                <Text style={styles.hoursLabel}>Operating hours</Text>
                <View style={styles.hoursRow}>
                  <TextInput style={styles.timeInput} value={row.hoursStart} onChangeText={v => updateRow('current', i, 'hoursStart', v)} placeholder="06:00" placeholderTextColor={Colors.textTertiary} />
                  <Text style={styles.timeSep}>to</Text>
                  <TextInput style={styles.timeInput} value={row.hoursEnd} onChangeText={v => updateRow('current', i, 'hoursEnd', v)} placeholder="18:00" placeholderTextColor={Colors.textTertiary} />
                </View>
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addRowBtn} onPress={() => addRow('current')}>
          <Text style={styles.addRowBtnText}>+ Add light type</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* NEW LIGHTS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>New lights</Text>
          <Text style={styles.totalBadge}>Total: {getTotal(newLights)}</Text>
        </View>
        {newLights.map((row, i) => (
          <View key={i} style={[styles.lightBlock, row.hoursOn && styles.lightBlockHours]}>
            <View style={styles.lightRow}>
              <TextInput
                style={styles.qtyInput}
                keyboardType="numeric"
                value={row.qty}
                onChangeText={v => updateRow('new', i, 'qty', v)}
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
              />
              <TouchableOpacity
                style={styles.typePickerWrap}
                onPress={() => {
                  setPickerTarget({ section: 'new', index: i });
                  setPickerVisible(true);
                }}
              >
                <Text style={[styles.typeText, row.type && { color: Colors.textPrimary }]} numberOfLines={1}>
                  {row.type || 'Select type...'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.clockBtn, row.hoursOn && styles.clockBtnOn]}
                onPress={() => updateRow('new', i, 'hoursOn', !row.hoursOn)}
              >
                <Text style={{ fontSize: 14 }}>⏱</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => removeRow('new', i)}>
                <Text style={styles.delBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {row.hoursOn && (
              <View style={styles.hoursExpand}>
                <Text style={styles.hoursLabel}>Operating hours</Text>
                <View style={styles.hoursRow}>
                  <TextInput style={styles.timeInput} value={row.hoursStart} onChangeText={v => updateRow('new', i, 'hoursStart', v)} placeholder="06:00" placeholderTextColor={Colors.textTertiary} />
                  <Text style={styles.timeSep}>to</Text>
                  <TextInput style={styles.timeInput} value={row.hoursEnd} onChangeText={v => updateRow('new', i, 'hoursEnd', v)} placeholder="18:00" placeholderTextColor={Colors.textTertiary} />
                </View>
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addRowBtn} onPress={() => addRow('new')}>
          <Text style={styles.addRowBtnText}>+ Add light type</Text>
        </TouchableOpacity>

        {job?.col_sensor && <>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Occupancy sensor</Text>
          <View style={styles.lightRow}>
            <TextInput style={styles.qtyInput} keyboardType="numeric" value={sensorQty} onChangeText={setSensorQty} placeholder="0" placeholderTextColor={Colors.textTertiary} />
            <TouchableOpacity
              style={styles.typePickerWrap}
              onPress={() => {
                setPickerTarget({ section: 'sensor', index: 0 });
                setPickerVisible(true);
              }}
            >
              <Text style={[styles.typeText, sensorType && { color: Colors.textPrimary }]}>
                {sensorType || 'Select type...'}
              </Text>
            </TouchableOpacity>
          </View>
        </>}

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

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={() => save(false)}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save changes</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.doneBtn, isComplete && styles.doneBtnActive]}
          onPress={() => save(true)}
          disabled={saving}
        >
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
  container: { maxWidth: 700, margin: '0 auto', padding: '40px 32px 80px' },
  header: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 },
  backBtn: { padding: '8px 16px', background: '#fff', border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: Colors.textSecondary, whiteSpace: 'nowrap' },
  headerTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  card: { background: '#fff', borderRadius: 16, padding: '28px 32px', border: '0.5px solid #e0e7ef', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' },
  totalBadge: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  colHeads: { display: 'flex', gap: 8, fontSize: 10, color: '#aaa', marginBottom: 6, alignItems: 'center' },
  lightRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 },
  qtyInput: { width: 70, padding: '8px', fontSize: 13, border: '0.5px solid #e0e7ef', borderRadius: 8, textAlign: 'center', outline: 'none' },
  typeSelect: { flex: 1, padding: '8px', fontSize: 13, border: '0.5px solid #e0e7ef', borderRadius: 8, outline: 'none', background: '#fff' },
  clockBtn: { width: 34, height: 34, borderRadius: 8, border: '0.5px solid #e0e7ef', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, flexShrink: 0 },
  clockBtnOn: { background: '#FAEEDA', borderColor: '#EF9F27' },
  delBtn: { width: 28, height: 28, borderRadius: 14, border: '0.5px solid #e0e7ef', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: '#aaa', flexShrink: 0 },
  hoursExpand: { background: '#FAEEDA', borderRadius: 8, padding: '8px 12px', marginBottom: 8 },
  hoursLabel: { fontSize: 10, color: '#854F0B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  hoursRow: { display: 'flex', alignItems: 'center', gap: 8 },
  timeInput: { padding: '6px 8px', fontSize: 13, border: '0.5px solid #EF9F27', borderRadius: 6, outline: 'none', background: '#fff', color: '#412402' },
  addRowBtn: { width: '100%', padding: '9px', background: 'transparent', border: '0.5px dashed #c0cfe0', borderRadius: 8, fontSize: 12, color: Colors.blue, cursor: 'pointer', marginTop: 4, marginBottom: 4 },
  divider: { borderTop: '0.5px solid #f0f0f0', margin: '20px 0' },
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1 },
  totalBadge: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  lightBlock: { borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 10, backgroundColor: '#fff', marginBottom: 8, overflow: 'hidden' },
  lightBlockHours: { borderColor: '#EF9F27' },
  lightRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  qtyInput: { width: 55, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 8, padding: 8, fontSize: 13, color: Colors.textPrimary, textAlign: 'center', backgroundColor: Colors.bgSecondary },
  typePickerWrap: { flex: 1, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: 8, padding: 10, backgroundColor: Colors.bgSecondary, justifyContent: 'center', minHeight: 40 },
  typeText: { fontSize: 12, color: Colors.textTertiary },
  clockBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 0.5, borderColor: Colors.borderLight, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  clockBtnOn: { backgroundColor: '#FAEEDA', borderColor: '#EF9F27' },
  delBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 0.5, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  delBtnText: { fontSize: 11, color: Colors.textTertiary },
  hoursExpand: { backgroundColor: '#FAEEDA', padding: 10 },
  hoursLabel: { fontSize: 10, color: '#854F0B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { borderWidth: 0.5, borderColor: '#EF9F27', borderRadius: 6, padding: 6, fontSize: 12, color: '#412402', backgroundColor: '#fff', width: 80 },
  timeSep: { fontSize: 12, color: '#854F0B' },
  addRowBtn: { borderWidth: 1, borderColor: '#c0cfe0', borderStyle: 'dashed', borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 4 },
  addRowBtnText: { fontSize: 12, color: Colors.blue },
  divider: { height: 0.5, backgroundColor: Colors.borderLight, marginVertical: 20 },
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
  modalItem: { padding: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  modalItemText: { fontSize: 14, color: Colors.textPrimary },
  modalSearchWrap: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight, backgroundColor: Colors.bgSecondary },
  modalSearchIcon: { fontSize: 14, marginRight: 8 },
  modalSearchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, padding: 0 },
  modalEmpty: { padding: 32, alignItems: 'center' },
  modalEmptyText: { fontSize: 14, color: Colors.textTertiary },
});