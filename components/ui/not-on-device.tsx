import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';

// Shown when a job is opened without signal on a phone that has never downloaded it.
export function NotOnDevice({ backHref = '/home' }: { backHref?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>📵</Text>
      <Text style={styles.title}>Not saved on this phone yet</Text>
      <Text style={styles.body}>
        This job hasn&apos;t been downloaded to this phone, and there&apos;s no signal right now.
        Open it once with signal (for example before leaving the office) and it will work offline after that.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.push(backHref as any)}>
        <Text style={styles.btnText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: Colors.bgSecondary },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  body: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20, maxWidth: 420 },
  btn: { backgroundColor: Colors.blue, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
