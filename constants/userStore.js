import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let currentUser = null;

export async function setCurrentUser(user) {
  currentUser = user;
  if (Platform.OS === 'web') {
    localStorage.setItem('led_pro_current_session', JSON.stringify(user));
  } else {
    await AsyncStorage.setItem('led_pro_current_session', JSON.stringify(user));
  }
}

export async function getCurrentUser() {
  if (currentUser) return currentUser;
  try {
    if (Platform.OS === 'web') {
      const stored = localStorage.getItem('led_pro_current_session');
      if (stored) { currentUser = JSON.parse(stored); return currentUser; }
    } else {
      const stored = await AsyncStorage.getItem('led_pro_current_session');
      if (stored) { currentUser = JSON.parse(stored); return currentUser; }
    }
  } catch (e) {
    console.log('Error getting user:', e);
  }
  return null;
}

export async function clearCurrentUser() {
  currentUser = null;
  if (Platform.OS === 'web') {
    localStorage.removeItem('led_pro_current_session');
  } else {
    await AsyncStorage.removeItem('led_pro_current_session');
  }
}