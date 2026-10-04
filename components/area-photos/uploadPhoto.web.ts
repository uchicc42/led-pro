import type { ImagePickerAsset } from 'expo-image-picker';
import { supabase } from '../../supabase';

// Web upload: the picker gives a browser File, which Supabase Storage accepts directly.
// The native version lives in uploadPhoto.ts.

export async function uploadPhoto(bucket: string, path: string, asset: ImagePickerAsset) {
  const body = asset.file ?? await (await fetch(asset.uri)).blob();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: asset.mimeType || body.type || 'image/jpeg' });
  return { error };
}
