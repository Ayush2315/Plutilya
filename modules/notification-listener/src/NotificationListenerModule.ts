import { requireNativeModule } from 'expo-modules-core';

// This will throw if the native module is not available (Expo Go, iOS, web).
// Use the safe wrapper in ../index.ts instead of importing this directly.
export default requireNativeModule('NotificationListener');
