import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// The team member logged in on this device (display details only).
// PINs are never stored: older saved logins included one, so it's stripped on load.

const KEY = 'led_pro_current_session';
let currentUser = null;

function withoutSecrets(user) {
  if (!user) return null;
  const { pin_hash, expo_push_token, ...rest } = user;
  return rest;
}

async function write(user) {
  const value = JSON.stringify(user);
  if (Platform.OS === 'web') localStorage.setItem(KEY, value);
  else await AsyncStorage.setItem(KEY, value);
}

export async function setCurrentUser(user) {
  currentUser = withoutSecrets(user);
  await write(currentUser);
}

export async function getCurrentUser() {
  if (currentUser) return currentUser;
  try {
    const stored = Platform.OS === 'web' ? localStorage.getItem(KEY) : await AsyncStorage.getItem(KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      currentUser = withoutSecrets(parsed);
      // Re-save without the PIN if an older version stored one.
      if (parsed && 'pin_hash' in parsed) await write(currentUser);
      return currentUser;
    }
  } catch (e) {
    console.log('Error getting user:', e);
  }
  return null;
}

export async function clearCurrentUser() {
  currentUser = null;
  if (Platform.OS === 'web') {
    localStorage.removeItem(KEY);
  } else {
    await AsyncStorage.removeItem(KEY);
  }
}
