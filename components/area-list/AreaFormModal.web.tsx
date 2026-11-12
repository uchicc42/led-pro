import type { CSSProperties } from 'react';
import { Colors } from '../../constants/Colors';
import type { AreaForm } from './useAreaForm';

// Web "New area" / "Duplicate" box. The native version is AreaFormModal.tsx.

type Props = {
  form: AreaForm | null;
  parentOptions: { id: string; name: string }[];
  setName: (name: string) => void;
  setParent: (parentId: string | null) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export default function AreaFormModal({ form, parentOptions, setName, setParent, onSubmit, onClose }: Props) {
  if (!form) return null;
  const duplicating = form.mode === 'duplicate';
  const moving = form.mode === 'move';
  const ready = !!form.name.trim();

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.box} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>{moving ? 'Move or rename area' : duplicating ? 'Duplicate area' : 'New area'}</div>
        <input
          autoFocus
          style={styles.input}
          placeholder="Name (e.g. Gym, Suite 220, Office A)"
          value={form.name}
          onChange={e => setName(e.target.value)}
          onFocus={e => { if (duplicating) e.target.select(); }}
          onKeyDown={e => { if (e.key === 'Enter' && ready) onSubmit(); if (e.key === 'Escape') onClose(); }}
        />

        {parentOptions.length > 0 && (
          <>
            <div style={styles.label}>Put it in</div>
            <select
              style={styles.input}
              value={form.parentId ?? ''}
              onChange={e => setParent(e.target.value || null)}
            >
              <option value="">Top level</option>
              {parentOptions.map(p => <option key={p.id} value={p.id}>› {p.name}</option>)}
            </select>
          </>
        )}

        {moving && parentOptions.length === 0 && (
          <div style={styles.note}>This area has rooms inside it, so it stays at the top level.</div>
        )}

        {duplicating && (
          <div style={styles.note}>
            Copies the light rows, sensors, photocells and dimmers. Photos, notes, rooms and progress start fresh.
          </div>
        )}

        <div style={styles.buttons}>
          <button style={styles.cancel} onClick={onClose}>Cancel</button>
          <button style={{ ...styles.confirm, opacity: ready ? 1 : 0.5 }} onClick={onSubmit} disabled={!ready}>
            {moving ? 'Save' : duplicating ? 'Duplicate' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 },
  box: { background: '#fff', borderRadius: 12, padding: 20, width: '100%', maxWidth: 440, boxShadow: '0 8px 30px rgba(0,0,0,0.2)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  title: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 12 },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: 14, border: '0.5px solid #e0e7ef', borderRadius: 10, outline: 'none', fontFamily: 'inherit', marginBottom: 12, background: '#fff' },
  label: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 },
  note: { fontSize: 12, color: Colors.textTertiary, marginBottom: 4 },
  buttons: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  confirm: { padding: '10px 20px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: '500' },
  cancel: { padding: '10px 16px', background: '#fff', color: Colors.textSecondary, border: '0.5px solid #e0e7ef', borderRadius: 10, fontSize: 14, cursor: 'pointer' },
};
