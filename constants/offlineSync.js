import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

const QUEUE_KEY = 'offline_sync_queue';

// Add an action to the offline queue
export async function queueAction(action) {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = existing ? JSON.parse(existing) : [];
    queue.push({ ...action, timestamp: Date.now() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.log('Queue error:', e);
  }
}

// Process all queued actions when back online
export async function syncQueue() {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    if (!existing) return;
    const queue = JSON.parse(existing);
    if (queue.length === 0) return;

    const failed = [];
    for (const action of queue) {
      try {
        if (action.type === 'upsert_install_row') {
          await supabase.from('install_rows').upsert(action.data);
        } else if (action.type === 'update_area') {
          await supabase.from('areas').update(action.data).eq('id', action.id);
        }
      } catch (e) {
        failed.push(action);
      }
    }

    // Keep only failed actions in queue
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  } catch (e) {
    console.log('Sync error:', e);
  }
}

// Check if device is online
export async function isOnline() {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  try {
    const response = await fetch('https://www.google.com', { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// Save install data — online goes direct, offline goes to queue
export async function saveInstallData(areaId, data) {
  const online = await isOnline();
  if (online) {
    await supabase.from('areas').update(data).eq('id', areaId);
    await syncQueue(); // Sync any previously queued items too
  } else {
    await queueAction({ type: 'update_area', id: areaId, data });
  }
}

export async function saveInstallRow(rowData) {
  const online = await isOnline();
  if (online) {
    await supabase.from('install_rows').upsert(rowData);
    await syncQueue();
  } else {
    await queueAction({ type: 'upsert_install_row', data: rowData });
  }
}