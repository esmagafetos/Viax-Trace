import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="process" />
      <Tabs.Screen name="tool" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
