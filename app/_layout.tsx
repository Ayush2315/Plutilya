import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { initDatabase } from '../src/db/schema';
import { initAutoCapture } from '../src/services/autoCapture';

export default function RootLayout() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then((database) => {
        setDb(database);
        initAutoCapture();
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>DB Error: {error}</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  if (!db) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C5CFC" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#121212' },
          headerTintColor: '#F5F5F5',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="category/[name]"
          options={({ route }) => ({
            title:
              (route.params as { name?: string })?.name
                ?.replace(/^\w/, (c: string) => c.toUpperCase()) ?? 'Category',
            headerShown: true,
          })}
        />
        <Stack.Screen
          name="group/[id]"
          options={{ title: 'Group', headerShown: true }}
        />
        <Stack.Screen
          name="expense/[id]"
          options={{ title: 'Expense Details', headerShown: true }}
        />
        <Stack.Screen
          name="split/[id]"
          options={{ title: 'Split Expense', headerShown: true }}
        />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
