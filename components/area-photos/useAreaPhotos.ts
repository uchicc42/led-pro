import type { ImagePickerAsset } from 'expo-image-picker';
import { useState } from 'react';
import { getCurrentUser } from '../../constants/userStore';
import { deleteRow, newId, patchRow, queueCall, saveRow } from '../../lib/offline/data';
import { pendingUploads, useOutboxState } from '../../lib/offline/outbox';
import { useStore } from '../../lib/offline/store';
import {
  CAMERA_DENIED_MESSAGE, displayUrl, photoPath, pickFromCamera, pickFromLibrary, removePhotoFile, savePhoto,
} from './pickPhotos';

export type AreaPhoto = {
  id: string;
  storage_path: string;
  taken_by_name: string | null;
  created_at: string;
  note: string | null;
  url: string;
  /** Still waiting to upload from this phone. */
  pending: boolean;
  _localUri?: string | null;
};

// Photos are saved on the phone first and upload when there's signal, so they can be taken
// anywhere on site. The list comes from the device copy.
export function useAreaPhotos(areaId: string | undefined, jobId: string | undefined) {
  const store = useStore();
  useOutboxState(); // re-render as uploads finish, to clear the "waiting" marker
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const waiting = pendingUploads();
  const photos: AreaPhoto[] = store.where('area_photos', p => p.area_id === areaId)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map(p => ({
      id: p.id,
      storage_path: p.storage_path,
      taken_by_name: p.taken_by_name ?? null,
      created_at: p.created_at,
      note: p.note ?? null,
      _localUri: p._localUri ?? null,
      url: displayUrl(p.storage_path, p._localUri),
      pending: waiting.has(p.storage_path),
    }));

  /** Takes a photo; returns the new photo's id so the screen can offer to add a note. */
  async function takePhoto(): Promise<string | null> {
    setError('');
    const assets = await pickFromCamera();
    if (assets === null) { setError(CAMERA_DENIED_MESSAGE); return null; }
    const ids = await savePhotos(assets);
    return ids[0] ?? null;
  }

  async function choosePhoto() {
    setError('');
    await savePhotos(await pickFromLibrary(true));
  }

  async function savePhotos(assets: ImagePickerAsset[]): Promise<string[]> {
    if (!areaId || !jobId || assets.length === 0) return [];
    setSaving(true);
    const user = await getCurrentUser();
    const savedIds: string[] = [];

    for (const asset of assets) {
      const path = photoPath(`${jobId}/${areaId}`, asset);
      const { localUri, error: saveError } = await savePhoto(path, asset);
      if (saveError) {
        setError(saveError);
        continue;
      }
      // Queued after the file, so the record only reaches the server once the photo has.
      const id = newId();
      saveRow('area_photos', {
        id,
        area_id: areaId,
        storage_path: path,
        taken_by_name: user?.name ?? null,
        created_at: new Date().toISOString(),
        _localUri: localUri ?? null,
      });
      savedIds.push(id);
    }

    if (savedIds.length > 0) {
      queueCall('logChange', areaId, jobId, user?.id, user?.name, 'photo_added', `${savedIds.length} photo(s) added`);
    }
    setSaving(false);
    return savedIds;
  }

  function saveNote(photo: AreaPhoto, note: string) {
    patchRow('area_photos', photo.id, { note: note || null });
  }

  function deletePhoto(photo: AreaPhoto) {
    setError('');
    deleteRow('area_photos', photo.id);
    removePhotoFile(photo.storage_path, photo._localUri);
  }

  return { photos, uploading: saving, error, takePhoto, choosePhoto, deletePhoto, saveNote };
}
