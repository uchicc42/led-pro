import { useState, type CSSProperties } from 'react';
import { Colors } from '../../constants/Colors';
import { AreaPhoto, useAreaPhotos } from './useAreaPhotos';

// Web photo grid for an area. The native version lives in AreaPhotos.tsx.

export default function AreaPhotos({ areaId, jobId }: { areaId?: string; jobId?: string }) {
  const { photos, uploading, error, choosePhoto, deletePhoto } = useAreaPhotos(areaId, jobId);
  const [viewing, setViewing] = useState<AreaPhoto | null>(null);

  async function confirmDelete(photo: AreaPhoto) {
    if (!window.confirm('Remove this photo from the area?')) return;
    await deletePhoto(photo);
    setViewing(null);
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
          {uploading ? 'Uploading…' : '📷 Add photos'}
        </button>
      </div>

      {error && <div style={webStyles.error}>{error}</div>}

      {photos.length > 0 ? (
        <div style={webStyles.grid}>
          {photos.map(p => (
            <img key={p.id} src={p.url} alt="Area photo" style={webStyles.thumb} onClick={() => setViewing(p)} />
          ))}
        </div>
      ) : (
        !uploading && <div style={webStyles.empty}>No photos yet for this area.</div>
      )}

      {viewing && (
        <div style={webStyles.overlay} onClick={() => setViewing(null)}>
          <div style={webStyles.viewer} onClick={e => e.stopPropagation()}>
            <img src={viewing.url} alt="Area photo" style={webStyles.viewerImage} />
            <div style={webStyles.viewerBar}>
              <span style={webStyles.viewerMeta}>
                {viewing.taken_by_name ? `${viewing.taken_by_name} · ` : ''}
                {new Date(viewing.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
              <a href={viewing.url} target="_blank" rel="noreferrer" style={webStyles.viewerLink}>Open full size</a>
              <button style={webStyles.deleteBtn} onClick={() => confirmDelete(viewing)}>Delete</button>
              <button style={webStyles.closeBtn} onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const webStyles: Record<string, CSSProperties> = {
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
