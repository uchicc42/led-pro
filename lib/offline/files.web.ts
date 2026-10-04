import type { ImagePickerAsset } from 'expo-image-picker';
import { supabase } from '../../supabase';

// Web: browsers can't reliably keep picked files for later, and the web app is used with a
// connection, so photos upload immediately. The phone version is files.ts.

export async function storePhoto(bucket: string, path: string, asset: ImagePickerAsset): Promise<{ localUri?: string; error?: string }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { error: 'Adding photos needs a connection on the web.' };
  }
  const body = asset.file ?? await (await fetch(asset.uri)).blob();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: asset.mimeType || body.type || 'image/jpeg' });
  return error ? { error: 'The photo could not be uploaded. Check your connection and try again.' } : {};
}

export function deleteLocalPhoto(_localUri: string | null | undefined) {
  // Nothing is stored on the device on web.
}
