import { useState, type CSSProperties } from 'react';
import { Colors } from '../../constants/Colors';
import { AreaPhoto, useAreaPhotos } from './useAreaPhotos';

// Web photo grid for an area. The native version lives in AreaPhotos.tsx.

export default function AreaPhotos({ areaId, jobId }: { areaId?: string; jobId?: string }) {
  const { photos, uploading, error, choosePhoto, deletePhoto, saveNote } = useAreaPhotos(areaId, jobId);
  // Tracked by id so the lightbox always shows the latest saved note.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const viewing = photos.find(p => p.id === viewingId) ?? null;

  function open(photo: AreaPhoto) {
    setViewingId(photo.id);
    setNoteDraft(photo.note ?? '');
  }

  const noteChanged = !!viewing && noteDraft.trim() !== (viewing.note ?? '').trim();

  function close() {
    // Closing keeps a typed note rather than silently throwing it away.
    if (viewing && noteChanged) saveNote(viewing, noteDraft.trim());
    setViewingId(null);
  }

  async function confirmDelete(photo: AreaPhoto) {
    if (!window.confirm('Remove this photo from the area?')) return;
    deletePhoto(photo);
    setViewingId(null);
  }

  return (
    <div style={webStyles.block}>
      <div style={webStyles.headerRow}>
        <div style={webStyles.label}>Photos{photos.length > 0 ? ` (${photos.length})` : ''}</div>
        <button
          style={{ ...webStyles.addBtn, opacity: uploading ? 0.6 : 1 }}
          onClick={choosePhoto}
          disabled={uploading}
        >
          {uploading ? 'Saving…' : '📷 Add photos'}
        </button>
      </div>

      {error && <div style={webStyles.error}>{error}</div>}

      {photos.length > 0 ? (
        <div style={webStyles.grid}>
          {photos.map(p => (
            <div key={p.id} style={webStyles.thumbWrap} onClick={() => open(p)} title={p.note || undefined}>
              <img src={p.url} alt={p.note || 'Area photo'} style={webStyles.thumb} />
              {p.note && <span style={webStyles.noteBadge}>📝</span>}
            </div>
          ))}
        </div>
      ) : (
        !uploading && <div style={webStyles.empty}>No photos yet for this area.</div>
      )}

      {viewing && (
        <div style={webStyles.overlay} onClick={close}>
          <div style={webStyles.viewer} onClick={e => e.stopPropagation()}>
            <img src={viewing.url} alt={viewing.note || 'Area photo'} style={webStyles.viewerImage} />
            <div style={webStyles.noteRow}>
              <textarea
                style={webStyles.noteInput}
                rows={2}
                placeholder="Add a note…"
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
              />
              {noteChanged && (
                <button style={webStyles.saveNoteBtn} onClick={() => saveNote(viewing, noteDraft.trim())}>Save note</button>
              )}
            </div>
            <div style={webStyles.viewerBar}>
              <span style={webStyles.viewerMeta}>
                {viewing.taken_by_name ? `${viewing.taken_by_name} · ` : ''}
                {new Date(viewing.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
              <a href={viewing.url} target="_blank" rel="noreferrer" style={webStyles.viewerLink}>Open full size</a>
              <button style={webStyles.deleteBtn} onClick={() => confirmDelete(viewing)}>Delete</button>
              <button style={webStyles.closeBtn} onClick={close}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
  thumbWrap: { position: 'relative', cursor: 'pointer' },
  noteBadge: { position: 'absolute', left: 4, bottom: 4, background: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: '0 5px', fontSize: 11 },
  noteRow: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  noteInput: { flex: 1, padding: '8px 10px', fontSize: 14, borderRadius: 8, border: 'none', outline: 'none', fontFamily: 'inherit', resize: 'vertical', background: 'rgba(255,255,255,0.92)' },
  saveNoteBtn: { padding: '8px 14px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: '500' },
  block: { marginBottom: 16 },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' },
  addBtn: { padding: '7px 14px', background: Colors.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: '500' },
  error: { color: '#A32D2D', fontSize: 13, marginBottom: 8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 },
  thumb: { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, cursor: 'pointer', background: Colors.bgSecondary },
  empty: { fontSize: 13, color: Colors.textTertiary },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  viewer: { maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: 10 },
  viewerImage: { maxWidth: '90vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 8 },
  viewerBar: { display: 'flex', alignItems: 'center', gap: 12 },
  viewerMeta: { color: '#ccc', fontSize: 13, flex: 1 },
  viewerLink: { color: '#9cc9ff', fontSize: 13 },
  deleteBtn: { padding: '7px 14px', background: 'transparent', color: '#FF8A80', border: '1px solid #FF8A80', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  closeBtn: { padding: '7px 14px', background: '#fff', color: '#222', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
};
