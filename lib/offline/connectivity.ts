import NetInfo from '@react-native-community/netinfo';
import { useSyncExternalStore } from 'react';

// Tracks whether the device can reach the internet. "Connected to Wi-Fi but no internet"
// (isInternetReachable === false) counts as offline; unknown reachability counts as online.

let online = true;
const listeners = new Set<() => void>();

NetInfo.addEventListener(state => {
  const next = !!state.isConnected && state.isInternetReachable !== false;
  if (next !== online) {
    online = next;
    listeners.forEach(l => l());
  }
});

export function isOnline() {
  return online;
}

export function subscribeOnline(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, isOnline, () => true);
}
