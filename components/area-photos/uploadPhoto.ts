import type { ImagePickerAsset } from 'expo-image-picker';
import { supabase } from '../../supabase';

// Native upload: the picker returns base64 (requested with `base64: true`), which is
// decoded to bytes because React Native can't hand a local file URI to Supabase Storage.
// The web version lives in uploadPhoto.web.ts.

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function uploadPhoto(bucket: string, path: string, asset: ImagePickerAsset) {
  if (!asset.base64) return { error: new Error('Photo data missing') };
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, base64ToBytes(asset.base64), { contentType: asset.mimeType || 'image/jpeg' });
  return { error };
}
