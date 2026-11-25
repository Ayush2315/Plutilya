import type { EventSubscription } from 'expo-modules-core';

// ─── Types ───────────────────────────────────────────────────────────
export interface NotificationData {
  packageName: string;
  title: string;
  text: string;
  timestamp: number;
}

// ─── Events map for the native module ────────────────────────────────
interface NotificationEventsMap {
  onNotificationReceived: (data: NotificationData) => void;
}

// ─── Native module interface ─────────────────────────────────────────
interface NotificationListenerNativeModule {
  isPermissionGranted(): boolean;
  openNotificationAccessSettings(): void;
  consumePendingNotifications(): NotificationData[];
  addListener<K extends keyof NotificationEventsMap>(
    eventName: K,
    listener: NotificationEventsMap[K],
  ): EventSubscription;
}

// ─── Safe native module loading ──────────────────────────────────────
// Returns null in Expo Go / iOS / web — the app never crashes.
let nativeModule: NotificationListenerNativeModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nativeModule = require('./src/NotificationListenerModule').default;
} catch {
  // Native module not available in this environment
}

/** Whether the native notification listener is available (false in Expo Go / iOS). */
export const isAvailable: boolean = nativeModule != null;

/** Check if Notification Access permission has been granted in Android settings. */
export function isPermissionGranted(): boolean {
  if (!nativeModule) return false;
  return nativeModule.isPermissionGranted();
}

/** Open Android's Notification Access settings screen. */
export function openNotificationAccessSettings(): void {
  if (!nativeModule) return;
  nativeModule.openNotificationAccessSettings();
}

/** Consume (read & clear) notifications captured while the app was backgrounded/closed. */
export function consumePendingNotifications(): NotificationData[] {
  if (!nativeModule) return [];
  return nativeModule.consumePendingNotifications();
}

/** Subscribe to real-time notification events. Returns a subscription to .remove() later. */
export function addNotificationListener(
  callback: (data: NotificationData) => void,
): EventSubscription | null {
  if (!nativeModule) return null;
  return nativeModule.addListener('onNotificationReceived', callback);
}
