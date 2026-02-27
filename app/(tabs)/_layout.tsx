import { Tabs } from 'expo-router';
import { TabBar } from '@/components/layout/TabBar';
import { useHealthSyncOnForeground } from '@/hooks/useHealthKit';

export default function TabLayout() {
  useHealthSyncOnForeground();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="challenges" />
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
