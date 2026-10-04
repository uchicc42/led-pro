import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

// Legacy: the electrician screen's old offline queue. Offline changes now go through
// lib/offline (device copy + upload queue). This only uploads anything still waiting in the
// old queue from before that change, so no one loses work; it can be deleted once every
// phone has synced at least once on the new version.

const QUEUE_KEY = 'offline_sync_queue';

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
        } else if (action.type === 'update_control') {
          await supabase.from('area_controls').update(action.data).eq('id', action.id);
        }
      } catch {
        failed.push(action);
      }
    }

    // Keep only failed actions in queue
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  } catch (e) {
    console.log('Legacy sync error:', e);
  }
}
