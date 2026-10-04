import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { logChange } from '../../constants/notifications';
import { getCurrentUser } from '../../constants/userStore';
import { supabase } from '../../supabase';
import { uploadPhoto } from './uploadPhoto';

export const PHOTO_BUCKET = 'job-photos';

export type AreaPhoto = {
  id: string;
  storage_path: string;
  taken_by_name: string | null;
  created_at: string;
  url: string;
};

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.5, // keeps uploads small over job-site connections
  base64: true,
};

export function useAreaPhotos(areaId: string | undefined, jobId: string | undefined) {
  const [photos, setPhotos] = useState<AreaPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPhotos([]);
    if (areaId) loadPhotos();
  }, [areaId]);

  function publicUrl(path: string) {
    return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function loadPhotos() {
    const { data } = await supabase
      .from('area_photos')
      .select('*')
      .eq('area_id', areaId)
      .order('created_at', { ascending: false });
    if (data) setPhotos(data.map((p: any) => ({ ...p, url: publicUrl(p.storage_path) })));
  }

  async function takePhoto() {
    setError('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera access is off. Allow it for LED Pro in your phone settings to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled) await savePhotos(result.assets);
  }

  async function choosePhoto() {
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({ ...PICKER_OPTIONS, allowsMultipleSelection: true });
    if (!result.canceled) await savePhotos(result.assets);
  }

  async function savePhotos(assets: ImagePicker.ImagePickerAsset[]) {
    if (!areaId || !jobId) return;
    setUploading(true);
    const user = await getCurrentUser();
    let saved = 0;

    for (const asset of assets) {
      const ext = asset.mimeType === 'image/png' ? 'png' : 'jpg';
      const path = `${jobId}/${areaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await uploadPhoto(PHOTO_BUCKET, path, asset);
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
        await supabase.storage.from(PHOTO_BUCKET).remove([path]);
        setError('A photo could not be saved. Check your connection and try again.');
        continue;
      }
      setPhotos(prev => [{ ...data, url: publicUrl(path) }, ...prev]);
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
    await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
  }

  return { photos, uploading, error, takePhoto, choosePhoto, deletePhoto };
}
