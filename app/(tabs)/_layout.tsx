import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { display: 'none' },
    }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="home" />
      <Tabs.Screen name="new-job" />
      <Tabs.Screen name="area-list" />
      <Tabs.Screen name="area-entry" />
      <Tabs.Screen name="layout-canvas" />
      <Tabs.Screen name="electrician" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}