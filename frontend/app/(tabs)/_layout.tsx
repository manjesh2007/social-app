import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.colors.brandPrimary,
        tabBarInactiveTintColor: THEME.colors.tabInactive,
        tabBarStyle: {
          backgroundColor: THEME.colors.surface,
          borderTopColor: THEME.colors.divider,
          borderTopWidth: 1,
          ...(Platform.OS === 'web' ? { height: 64 } : {}),
        },
        tabBarItemStyle: {
          alignSelf: 'center',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarTestID: 'tab-home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarTestID: 'tab-friends',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post',
          tabBarTestID: 'tab-post',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',
          tabBarTestID: 'tab-nearby',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarTestID: 'tab-notifications',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
