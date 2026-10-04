import * as ImagePicker from 'expo-image-picker';
import { queueCall } from '../../lib/offline/data';
import { deleteLocalPhoto, storePhoto } from '../../lib/offline/files';
import { cancelUpload } from '../../lib/offline/outbox';

export const PHOTO_BUCKET = 'job-photos';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.5, // keeps uploads small over job-site connections
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

/** Saves a photo: kept on the phone and uploaded when there's signal (web uploads now). */
export function savePhoto(path: string, asset: ImagePicker.ImagePickerAsset) {
  return storePhoto(PHOTO_BUCKET, path, asset);
}

/** Where to show a photo from: the copy on this phone if there is one, otherwise its private link. */
export function displayUrl(localUri: string | null | undefined, link: string | null) {
  return localUri || link || '';
}

/** Removes a photo's file: cancels its upload if it hasn't happened yet, otherwise deletes it online. */
export function removePhotoFile(path: string, localUri?: string | null) {
  if (!cancelUpload(path)) queueCall('removeStorageFile', PHOTO_BUCKET, path);
  deleteLocalPhoto(localUri);
}
