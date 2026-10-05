import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';

// Shared layout for the public Privacy Policy and Terms of Use pages (required by Intuit for
// the QuickBooks connection). These pages are readable without logging in.

export const LEGAL = {
  appName: 'LED Pro',
  operator: 'Triple E Solutions LLC',
  contactEmail: 'REPLACE_WITH_CONTACT_EMAIL',
  effectiveDate: 'October 5, 2026',
  website: 'https://led-pro.expo.app',
};

export type Section = { heading: string; body: string[] };

export default function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: Section[] }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.push('/')} accessibilityRole="link">
        <Text style={styles.back}>← LED Pro</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{LEGAL.appName} · {LEGAL.operator} · Effective {LEGAL.effectiveDate}</Text>
      <Text style={styles.paragraph}>{intro}</Text>
      {sections.map(s => (
        <View key={s.heading} style={styles.section}>
          <Text style={styles.heading}>{s.heading}</Text>
          {s.body.map((p, i) => <Text key={i} style={styles.paragraph}>{p}</Text>)}
        </View>
      ))}
      <Text style={styles.contact}>Questions: {LEGAL.contactEmail}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  back: { fontSize: 14, color: Colors.blue, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  meta: { fontSize: 13, color: Colors.textTertiary, marginBottom: 20 },
  section: { marginTop: 18 },
  heading: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  paragraph: { fontSize: 15, lineHeight: 23, color: Colors.textSecondary, marginBottom: 10 },
  contact: { fontSize: 14, color: Colors.textSecondary, marginTop: 24, marginBottom: 40 },
});
