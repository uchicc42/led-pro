import { Directory, File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import { supabase } from '../../supabase';
import { queueUpload } from './data';
import { registerUploadHandler } from './outbox';

// Phone: a picked photo lives in a temporary folder the OS may clear, so it's copied into
// the app's own storage, shown from there, and uploaded from the queue when there's signal.
// The web version (files.web.ts) uploads straight away instead.

function photoDir() {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Keeps a photo on the device and queues it for upload. Returns the on-device file. */
export async function storePhoto(bucket: string, path: string, asset: ImagePickerAsset): Promise<{ localUri?: string; error?: string }> {
  try {
    const dest = new File(photoDir(), path.replace(/\//g, '_'));
    if (dest.exists) dest.delete();
    await new File(asset.uri).copy(dest);
    queueUpload({ bucket, path, localUri: dest.uri, contentType: asset.mimeType || 'image/jpeg' });
    return { localUri: dest.uri };
  } catch (e) {
    console.log('Photo save error:', e);
    return { error: 'The photo could not be saved on this phone. Try again.' };
  }
}

export function deleteLocalPhoto(localUri: string | null | undefined) {
  if (!localUri) return;
  try {
    const file = new File(localUri);
    if (file.exists) file.delete();
  } catch (e) {
    console.log('Photo delete error:', e);
  }
}

registerUploadHandler(async op => {
  const file = new File(op.localUri);
  // A missing file can never upload; report it as rejected rather than retrying forever.
  if (!file.exists) return { error: { message: 'Photo file is missing on this phone', statusCode: 400 } };
  const bytes = await file.bytes();
  const { error } = await supabase.storage.from(op.bucket).upload(op.path, bytes, { contentType: op.contentType, upsert: true });
  return { error };
});
