import { Tabs } from 'expo-router';
import { Text, StyleSheet, type TextStyle } from 'react-native';

/** Simple emoji-based tab icon (keeps deps minimal in M1). */
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#121212' },
        headerTintColor: '#F5F5F5',
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#2A2A2A',
        },
        tabBarActiveTintColor: '#7C5CFC',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-expense"
        options={{
          title: 'Add',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="➕" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👥" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 22,
    opacity: 0.6,
  } as TextStyle,
  iconFocused: {
    opacity: 1,
  } as TextStyle,
});
