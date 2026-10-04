import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabase';
import { uploadPhoto } from './uploadPhoto';

export const PHOTO_BUCKET = 'job-photos';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.5, // keeps uploads small over job-site connections
  base64: true,
};

export const CAMERA_DENIED_MESSAGE = 'Camera access is off. Allow it for LED Pro in your phone settings to take photos.';

// Returns the captured photo, [] if cancelled, or null if camera permission was denied.
export async function pickFromCamera(): Promise<ImagePicker.ImagePickerAsset[] | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  return result.canceled ? [] : result.assets;
}

export async function pickFromLibrary(multiple: boolean): Promise<ImagePicker.ImagePickerAsset[]> {
  const result = await ImagePicker.launchImageLibraryAsync({ ...PICKER_OPTIONS, allowsMultipleSelection: multiple });
  return result.canceled ? [] : result.assets;
}

export function photoPath(folder: string, asset: ImagePicker.ImagePickerAsset) {
  const ext = asset.mimeType === 'image/png' ? 'png' : 'jpg';
  return `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export async function uploadToBucket(path: string, asset: ImagePicker.ImagePickerAsset) {
  return uploadPhoto(PHOTO_BUCKET, path, asset);
}

export function photoUrl(path: string) {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function removeFromBucket(path: string) {
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}
