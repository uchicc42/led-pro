import type { ImagePickerAsset } from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { logChange } from '../../constants/notifications';
import { getCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';
import {
  CAMERA_DENIED_MESSAGE, photoPath, photoUrl, pickFromCamera, pickFromLibrary, removeFromBucket, uploadToBucket,
} from './pickPhotos';

export type AreaPhoto = {
  id: string;
  storage_path: string;
  taken_by_name: string | null;
  created_at: string;
  url: string;
};

export function useAreaPhotos(areaId: string | undefined, jobId: string | undefined) {
  const [photos, setPhotos] = useState<AreaPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPhotos([]);
    if (areaId) loadPhotos();
  }, [areaId]);

  async function loadPhotos() {
    const { data } = await supabase
      .from('area_photos')
      .select('*')
      .eq('area_id', areaId)
      .order('created_at', { ascending: false });
    if (data) setPhotos(data.map((p: any) => ({ ...p, url: photoUrl(p.storage_path) })));
  }

  async function takePhoto() {
    setError('');
    const assets = await pickFromCamera();
    if (assets === null) return setError(CAMERA_DENIED_MESSAGE);
    await savePhotos(assets);
  }

  async function choosePhoto() {
    setError('');
    await savePhotos(await pickFromLibrary(true));
  }

  async function savePhotos(assets: ImagePickerAsset[]) {
    if (!areaId || !jobId || assets.length === 0) return;
    setUploading(true);
    const user = await getCurrentUser();
    let saved = 0;

    for (const asset of assets) {
      const path = photoPath(`${jobId}/${areaId}`, asset);
      const { error: uploadError } = await uploadToBucket(path, asset);
      if (uploadError) {
        setError('A photo could not be uploaded. Check your connection and try again.');
        continue;
      }
      const { data, error: insertError } = await supabase
        .from('area_photos')
        .insert({ area_id: areaId, storage_path: path, taken_by_name: user?.name ?? null })
        .select()
        .single();
      if (insertError || !data) {
        // Don't leave an orphaned file in storage if the record couldn't be saved.
        await removeFromBucket(path);
        setError('A photo could not be saved. Check your connection and try again.');
        continue;
      }
      setPhotos(prev => [{ ...data, url: photoUrl(path) }, ...prev]);
      saved++;
    }

    if (saved > 0) {
      await logChange(areaId, jobId, user?.id, user?.name, 'photo_added', `${saved} photo(s) added`);
    }
    setUploading(false);
  }

  async function deletePhoto(photo: AreaPhoto) {
    setError('');
    const { error: deleteError } = await supabase.from('area_photos').delete().eq('id', photo.id);
    if (deleteError) {
      setError('The photo could not be deleted. Try again.');
      return;
    }
    await removeFromBucket(photo.storage_path);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
  }

  return { photos, uploading, error, takePhoto, choosePhoto, deletePhoto };
}
