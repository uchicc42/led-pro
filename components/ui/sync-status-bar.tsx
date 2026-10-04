import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnline } from '../../lib/offline/connectivity';
import { discardFailed, retryFailed, useOutboxState } from '../../lib/offline/outbox';
import { syncNow, useSyncState } from '../../lib/offline/sync';

// Thin strip at the bottom of the screen showing offline / upload status.
// Hidden when online with nothing waiting, so it only appears when it matters.

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function SyncStatusBar() {
  const online = useOnline();
  const { pending, failed, lastError } = useOutboxState();
  const { syncing } = useSyncState();
  const insets = useSafeAreaInsets();

  function showFailed() {
    const message = `${plural(failed, 'change')} couldn't be uploaded because the server rejected them. ` +
      'Try again, or discard them if they are no longer needed.';
    if (Platform.OS === 'web') {
      if (window.confirm(`${message}\n\nOK = try again, Cancel = keep for later`)) retryFailed();
      return;
    }
    Alert.alert('Upload problem', message, [
      { text: 'Keep for later', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: discardFailed },
      { text: 'Try again', onPress: () => { retryFailed(); syncNow(); } },
    ]);
  }

  let tone: 'offline' | 'uploading' | 'failed' | null = null;
  let message = '';
  let action: { label: string; onPress: () => void } | null = null;

  if (failed > 0) {
    tone = 'failed';
    message = `${plural(failed, 'change')} couldn't upload`;
    action = { label: 'Details', onPress: showFailed };
  } else if (!online) {
    tone = 'offline';
    message = pending > 0
      ? `Offline — ${plural(pending, 'change')} saved on this phone`
      : 'Offline — working from this phone’s copy';
  } else if (pending > 0) {
    tone = 'uploading';
    message = syncing ? `Uploading ${plural(pending, 'change')}…` : `${plural(pending, 'change')} waiting to upload`;
    if (!syncing) action = { label: 'Sync now', onPress: () => syncNow() };
    if (!syncing && lastError) message = `Upload paused — ${plural(pending, 'change')} waiting`;
  }

  if (!tone) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View style={[styles.bar, styles[tone]]}>
        <Text style={[styles.text, tone === 'offline' && { color: '#5C3A06' }]} numberOfLines={1}>{message}</Text>
        {action && (
          <TouchableOpacity onPress={action.onPress} hitSlop={8} style={styles.action}>
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, maxWidth: 520, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  offline: { backgroundColor: '#FAD98A' },
  uploading: { backgroundColor: '#185FA5' },
  failed: { backgroundColor: '#A32D2D' },
  text: { color: '#fff', fontSize: 13, fontWeight: '500', flexShrink: 1 },
  action: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)' },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
