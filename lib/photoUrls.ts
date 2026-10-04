import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '../supabase';
import { isOnline, useOnline } from './offline/connectivity';

// Photos are private: viewing one needs a time-limited link, issued only to logged-in team
// members. Links last a week and are saved on the device, so screens don't wait for one each
// time. (Images are cached by photo, not by link, so a photo seen before still shows offline
// even after its link has expired.)

const BUCKET = 'job-photos';
const STORAGE_KEY = 'ledpro:photo-links:v1';
const LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const RENEW_WITHIN_MS = 24 * 60 * 60 * 1000; // fetch a new link when < 1 day is left

type Entry = { url: string; expires: number };
let links: Record<string, Entry> = {};
let loading: Promise<void> | null = null;
let version = 0;
const listeners = new Set<() => void>();
const wanted = new Set<string>();
let fetchTimer: ReturnType<typeof setTimeout> | undefined;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function notify() {
  version++;
  listeners.forEach(l => l());
}

function load() {
  if (!loading) {
    loading = (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) links = { ...JSON.parse(saved), ...links };
      } catch (e) {
        console.log('Photo link load error:', e);
      }
      notify();
    })();
  }
  return loading;
}

function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(links)).catch(e => console.log('Photo link save error:', e));
  }, 500);
}

async function fetchWanted() {
  if (!isOnline() || wanted.size === 0) return;
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return;
  const paths = [...wanted];
  wanted.clear();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, LIFETIME_SECONDS);
  if (error || !data) {
    console.log('Photo link error:', error);
    return;
  }
  const expires = Date.now() + LIFETIME_SECONDS * 1000;
  data.forEach(d => { if (d.path && d.signedUrl) links[d.path] = { url: d.signedUrl, expires }; });
  notify();
  persist();
}

function request(paths: string[]) {
  const now = Date.now();
  paths.forEach(p => {
    const entry = links[p];
    if (!entry || entry.expires - now < RENEW_WITHIN_MS) wanted.add(p);
  });
  if (wanted.size === 0) return;
  clearTimeout(fetchTimer);
  fetchTimer = setTimeout(fetchWanted, 50);
}

/**
 * Returns a lookup from storage path to a viewable link for the given photos, requesting
 * links as needed. Returns null for a photo until its link has arrived.
 */
export function usePhotoLinks(paths: (string | null | undefined)[]) {
  const online = useOnline();
  useSyncExternalStore(
    l => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => version,
    () => version,
  );
  const list = paths.filter((p): p is string => !!p);
  const key = list.join('|');

  useEffect(() => {
    load().then(() => request(list));
    // `key` captures the list contents; `online` retries when signal returns.
  }, [key, online]);

  return (path: string | null | undefined) => (path ? links[path]?.url ?? null : null);
}
