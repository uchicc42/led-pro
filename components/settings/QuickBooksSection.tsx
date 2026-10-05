import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { LEGAL } from '../legal/LegalPage';
import { formatWhen, useQuickBooks } from './useQuickBooks';

// QuickBooks section of Settings (phone). Connecting is done once from the web version,
// where QuickBooks can return to Settings after sign-in; syncing works here.

export default function QuickBooksSection() {
  const { online, status, loaded, canSync, canManage, busy, message, error, syncNow, disconnect } = useQuickBooks();

  function confirmDisconnect() {
    Alert.alert('Disconnect QuickBooks', 'Stop syncing light types from QuickBooks? Types already synced stay in LED Pro.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: disconnect },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>🔗</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>QuickBooks</Text>
          <Text style={styles.sub}>
            {!loaded ? 'Checking…'
              : status?.connected ? `Connected${status.company_name ? ` to ${status.company_name}` : ''}${status.environment === 'sandbox' ? ' (test company)' : ''}`
              : 'Not connected'}
          </Text>
        </View>
      </View>

      {!online && <Text style={styles.hint}>📵 QuickBooks needs signal.</Text>}

      {online && status?.connected && (
        <>
          {status.reconnect_needed && <Text style={styles.warn}>Access expired: an owner needs to reconnect from the web version.</Text>}
          <Text style={styles.hint}>
            Non-inventory items sync into New LED light types. Last sync: {formatWhen(status.last_synced_at)}
            {status.last_sync_result ? ` — ${status.last_sync_result}` : ''}
          </Text>
          {canSync && (
            <TouchableOpacity style={[styles.primaryBtn, busy && { opacity: 0.6 }]} onPress={syncNow} disabled={!!busy}>
              <Text style={styles.primaryText}>{busy === 'sync' ? 'Syncing…' : '⟳ Sync now'}</Text>
            </TouchableOpacity>
          )}
          {canManage && (
            <TouchableOpacity onPress={confirmDisconnect} disabled={!!busy} style={styles.linkBtn}>
              <Text style={styles.linkDanger}>Disconnect</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {online && loaded && !status?.connected && (
        <Text style={styles.hint}>
          {canManage
            ? 'To connect, open LED Pro on a computer (led-pro.expo.app) → Settings → QuickBooks → Connect.'
            : 'An owner can connect QuickBooks from the web version.'}
        </Text>
      )}

      {!!message && <Text style={styles.ok}>{message}</Text>}
      {!!error && <Text style={styles.warn}>{error}</Text>}
      <Text style={styles.support}>
        Problems with QuickBooks? Email{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${LEGAL.contactEmail}?subject=LED%20Pro%20QuickBooks`)}>
          {LEGAL.contactEmail}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: Colors.borderLight, padding: 14, marginBottom: 8, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 20 },
  title: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  sub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  hint: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  warn: { fontSize: 12, color: '#A32D2D' },
  ok: { fontSize: 12, color: Colors.green },
  primaryBtn: { backgroundColor: '#2CA01C', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  linkBtn: { alignItems: 'center', paddingVertical: 6 },
  linkDanger: { fontSize: 13, color: '#A32D2D' },
  support: { fontSize: 11, color: Colors.textTertiary },
  link: { color: Colors.blue },
});
