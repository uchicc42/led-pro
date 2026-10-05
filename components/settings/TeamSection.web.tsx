import { useState, type CSSProperties } from 'react';
import { Colors } from '../../constants/Colors';
import { MEMBER_COLORS, Member, ROLES, useTeam } from './useTeam';

// Team section of Settings (web). The phone version is TeamSection.tsx.

const roleLabel = (role: string) => ROLES.find(r => r.key === role)?.label ?? role;

export default function TeamSection() {
  const {
    online, members, loaded, me, isOwner, editor, saving, error, setError, notice,
    startAdd, startEdit, updateEditor, closeEditor, saveEditor, removeMember, changeOwnPin,
  } = useTeam();
  const [expanded, setExpanded] = useState(false);
  const [ownPin, setOwnPin] = useState<string | null>(null);

  function confirmRemove() {
    if (!editor?.id) return;
    if (window.confirm(`Remove ${editor.name}? They won't be able to log in. Their name stays on past work.`)) {
      removeMember(editor.id);
    }
  }

  async function saveOwnPin() {
    if (ownPin !== null && await changeOwnPin(ownPin)) setOwnPin(null);
  }

  return (
    <div style={s.section}>
      <div style={s.sectionHeader} onClick={() => setExpanded(!expanded)}>
        <div style={s.sectionIcon}>👥</div>
        <div style={{ flex: 1 }}>
          <div style={s.sectionTitle}>Team members</div>
          <div style={s.sectionSub}>{isOwner ? 'Add people, change roles and PINs' : 'Who can log in'}</div>
        </div>
        <div style={s.count}>{loaded ? `${members.length} members` : ''}</div>
        <div style={s.chevron}>{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div style={s.panel}>
          {!online ? (
            <div style={s.hint}>Managing the team needs a connection.</div>
          ) : !loaded ? (
            <div style={s.hint}>Loading…</div>
          ) : (
            <>
              {members.map((m: Member) => (
                <div key={m.id} style={s.memberRow}>
                  <div style={{ ...s.avatar, background: m.color + '22', color: m.color }}>{m.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={s.memberName}>{m.name}{m.id === me?.id ? ' (you)' : ''}</div>
                    <div style={s.memberRole}>{roleLabel(m.role)}</div>
                  </div>
                  {isOwner && <button style={s.linkBtn} onClick={() => startEdit(m)}>Edit</button>}
                </div>
              ))}

              {notice && <div style={s.notice}>{notice}</div>}
              {error && !editor && <div style={s.error}>{error}</div>}

              <div style={s.actions}>
                {ownPin === null ? (
                  <button style={s.secondaryBtn} onClick={() => { setError(''); setOwnPin(''); }}>🔑 Change my PIN</button>
                ) : (
                  <>
                    <input
                      style={{ ...s.input, width: 160 }}
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="New 4-digit PIN"
                      value={ownPin}
                      onChange={e => setOwnPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      autoFocus
                    />
                    <button style={s.primaryBtn} onClick={saveOwnPin} disabled={saving}>Save</button>
                    <button style={s.linkBtn} onClick={() => setOwnPin(null)}>Cancel</button>
                  </>
                )}
                {isOwner && <button style={s.addBtn} onClick={startAdd}>+ Add team member</button>}
              </div>
            </>
          )}
        </div>
      )}

      {editor && (
        <div style={s.overlay} onClick={closeEditor}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>{editor.mode === 'add' ? 'Add team member' : `Edit ${editor.name || 'member'}`}</div>

            <div style={s.label}>Name</div>
            <input style={s.input} value={editor.name} onChange={e => updateEditor({ name: e.target.value })} placeholder="e.g. Sam Carter" autoFocus />

            <div style={s.label}>Initials</div>
            <input style={{ ...s.input, width: 90 }} value={editor.initials} maxLength={3} onChange={e => updateEditor({ initials: e.target.value.toUpperCase().slice(0, 3) })} />

            <div style={s.label}>Colour</div>
            <div style={s.swatches}>
              {MEMBER_COLORS.map(c => (
                <div key={c} title={c} onClick={() => updateEditor({ color: c })} style={{ ...s.swatch, background: c, ...(editor.color === c ? s.swatchActive : {}) }} />
              ))}
            </div>

            <div style={s.label}>Role</div>
            <div style={s.roles}>
              {ROLES.map(r => (
                <div key={r.key} onClick={() => updateEditor({ role: r.key })} style={{ ...s.role, ...(editor.role === r.key ? s.roleActive : {}) }}>
                  <div style={{ fontWeight: '500' }}>{r.label}</div>
                  <div style={s.roleSub}>{r.sub}</div>
                </div>
              ))}
            </div>

            <div style={s.label}>{editor.mode === 'add' ? 'PIN (4 digits)' : 'New PIN (leave blank to keep)'}</div>
            <input
              style={{ ...s.input, width: 140 }}
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={editor.pin}
              onChange={e => updateEditor({ pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            />

            {error && <div style={s.error}>{error}</div>}

            <div style={s.modalActions}>
              {editor.mode === 'edit' && editor.id !== me?.id && (
                <button style={s.removeBtn} onClick={confirmRemove} disabled={saving}>Remove from team</button>
              )}
              <div style={{ flex: 1 }} />
              <button style={s.linkBtn} onClick={closeEditor}>Cancel</button>
              <button style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={saveEditor} disabled={saving}>
                {saving ? 'Saving…' : editor.mode === 'add' ? 'Add member' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  section: { background: '#fff', borderRadius: 14, border: '0.5px solid #e0e7ef', marginBottom: 14, overflow: 'hidden' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer' },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  sectionSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  count: { fontSize: 12, color: Colors.textTertiary },
  chevron: { fontSize: 11, color: Colors.textTertiary, marginLeft: 8 },
  panel: { padding: '4px 20px 18px', borderTop: '0.5px solid #f0f0f0' },
  hint: { fontSize: 13, color: Colors.textSecondary, padding: '12px 0' },
  memberRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid #f5f5f5' },
  avatar: { width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: '600' },
  memberName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  memberRole: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  notice: { fontSize: 13, color: Colors.green, marginTop: 10 },
  error: { fontSize: 13, color: '#A32D2D', marginTop: 10 },
  actions: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  input: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 14, border: '0.5px solid #e0e7ef', borderRadius: 8, outline: 'none', fontFamily: 'inherit' },
  primaryBtn: { padding: '9px 18px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: '500', cursor: 'pointer' },
  secondaryBtn: { padding: '9px 16px', background: '#fff', color: Colors.textSecondary, border: '0.5px solid #e0e7ef', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  addBtn: { padding: '9px 16px', background: 'transparent', color: Colors.blue, border: '1px dashed #c0cfe0', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  linkBtn: { background: 'none', border: 'none', color: Colors.blue, fontSize: 13, cursor: 'pointer', padding: '6px 8px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { background: '#fff', borderRadius: 16, width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '22px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  label: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '14px 0 6px' },
  swatches: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 28, height: 28, borderRadius: 14, cursor: 'pointer', borderWidth: 3, borderStyle: 'solid', borderColor: 'transparent' },
  swatchActive: { borderColor: Colors.textPrimary },
  roles: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  role: { flex: '1 1 120px', padding: '10px 12px', borderRadius: 10, borderWidth: 0.5, borderStyle: 'solid', borderColor: '#e0e7ef', cursor: 'pointer', fontSize: 14, color: Colors.textPrimary },
  roleActive: { borderColor: Colors.blue, background: '#E6F1FB', color: '#0C447C' },
  roleSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  modalActions: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 },
  removeBtn: { background: 'none', border: '1px solid #e0b4b4', color: '#A32D2D', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' },
};
