# HANDOFF REPORT — Milestone 8: Native Android Notification Auto-Capture + EAS APK Build Setup

## 1. Status
**Completed** — `npx tsc --noEmit` passed with **0 errors**. Local Expo module with Kotlin `NotificationListenerService`, auto-capture pipeline, Settings UI controls, and EAS APK configuration are all in place.

## 2. Files Created / Modified

| # | File | Action | Summary |
|---|------|--------|---------|
| 1 | `modules/notification-listener/expo-module.config.json` | **Created** | Declares the Android-only Expo module with Kotlin class reference for auto-linking. |
| 2 | `modules/notification-listener/index.ts` | **Created** | Safe TS wrapper — exports `isAvailable`, `isPermissionGranted()`, `openNotificationAccessSettings()`, `consumePendingNotifications()`, `addNotificationListener()`. Never crashes in Expo Go / iOS / web. |
| 3 | `modules/notification-listener/src/NotificationListenerModule.ts` | **Created** | Raw `requireNativeModule('NotificationListener')` binding (used only by `index.ts`). |
| 4 | `modules/notification-listener/android/build.gradle` | **Created** | Android library Gradle config with Kotlin, `expo-modules-core` dependency, namespace `expo.modules.notificationlistener`. |
| 5 | `modules/notification-listener/android/src/main/AndroidManifest.xml` | **Created** | Registers `PlutilyaNotificationListener` with `BIND_NOTIFICATION_LISTENER_SERVICE` permission and intent-filter. |
| 6 | `modules/notification-listener/android/src/main/java/expo/modules/notificationlistener/NotificationListenerModule.kt` | **Created** | Expo Module: `isPermissionGranted()`, `openNotificationAccessSettings()`, `consumePendingNotifications()`, emits `onNotificationReceived` events via static callback from the listener service. |
| 7 | `modules/notification-listener/android/src/main/java/expo/modules/notificationlistener/PlutilyaNotificationListener.kt` | **Created** | Android `NotificationListenerService`: captures `packageName`, `title`, `text`/`bigText`, enqueues to `SharedPreferences` (max 50), emits via static callback when JS runtime is active. |
| 8 | `src/services/autoCapture.ts` | **Created** | Connects native listener → `parseTransactionMessage()` → `addExpense(source: 'notification')`. 2-minute deduplication window. `initAutoCapture()` drains pending queue + subscribes to live events. |
| 9 | `eas.json` | **Created** | EAS Build config with `preview` profile (`buildType: "apk"`) and empty `production` profile. |
| 10 | `app.json` | **Modified** | Added `"android.package": "com.plutilya.app"`. |
| 11 | `app/_layout.tsx` | **Modified** | Calls `initAutoCapture()` after DB init succeeds. |
| 12 | `app/(tabs)/settings.tsx` | **Modified** | Added **"🔔 Auto-Capture (Android Notifications)"** card: permission status, `Grant Notification Access` button, ON/OFF toggle with `auto_capture_enabled` setting. |

## 3. Native Module & Manifest Summary

### Service Registered
```xml
<service
  android:name="expo.modules.notificationlistener.PlutilyaNotificationListener"
  android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
  android:exported="true">
  <intent-filter>
    <action android:name="android.service.notification.NotificationListenerService" />
  </intent-filter>
</service>
```

### Module Functions
| Kotlin Function | Description |
|----------------|-------------|
| `isPermissionGranted()` | Checks `Settings.Secure.enabled_notification_listeners` for our component |
| `openNotificationAccessSettings()` | Opens `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS` |
| `consumePendingNotifications()` | Returns & clears SharedPreferences queue |
| Event: `onNotificationReceived` | Real-time emission when notification is posted (foreground) |

### Notification Queue
- Stored in `SharedPreferences("PlutilyaNotificationQueue")`
- Key: `pending_notifications` (JSON array)
- Max 50 entries, oldest dropped first
- Drained on app launch via `initAutoCapture()`

## 4. Commands to Build the APK

```bash
# 1. Install EAS CLI globally (if not already)
npm install -g eas-cli

# 2. Log in to your Expo account
eas login

# 3. Build the preview APK (cloud build)
cd f:\Codec\plutilya
eas build -p android --profile preview

# 4. After build completes, download the .apk from the URL EAS gives you
#    or use: eas build:list --platform android
```

> **First-time setup:** If this is your first EAS build for this project, EAS will prompt you to run `eas build:configure` and create/link the project in your Expo account.

## 5. Verification
- **TypeScript Check:** `npx tsc --noEmit` → **0 errors**.
- **Expo Go:** App runs normally. Auto-capture card shows `ℹ️ Requires APK Build (Unavailable in Expo Go)`. All M1–M7 features remain functional.
- **APK Build:** After installing the APK:
  1. Open **Settings** tab → `🔔 Auto-Capture` card shows `⚠️ Permission Required`.
  2. Tap **Grant Notification Access** → Android settings open → enable **Plutilya**.
  3. Return to app → status changes to `✅ Active`.
  4. Receive a bank/UPI SMS/notification → auto-captured as an expense (check Dashboard).
  5. Toggle switch to pause/resume auto-capture.

## 6. Known Issues / Watch Items for First EAS Build

1. **EAS Account Required:** You need a free Expo account. Run `eas login` before `eas build`.
2. **Asset Icons:** `app.json` references `android-icon-foreground.png`, `android-icon-background.png`, and `android-icon-monochrome.png` in `assets/`. If these files don't exist, the build may warn or fail — place any valid PNGs there or remove the adaptive icon config.
3. **Build Time:** First EAS cloud build typically takes 10–20 minutes (dependency install + Gradle compile).
4. **Kotlin Version Alignment:** The local module's `build.gradle` relies on the root project's `kotlinVersion` extension. EAS prebuild should set this automatically via Expo's managed Gradle config. If not, the `org.jetbrains.kotlin.android` plugin version defaults to what Expo SDK 58 ships.
5. **Notification Access is Per-Device:** Users must manually enable Notification Access in Android settings — there is no way to auto-grant it.

## 7. Cumulative Feature Map (M1–M8)

| Milestone | Features |
|-----------|----------|
| M1 | Expo project, SQLite schema (6 tables + app_settings), TS types, 4-tab layout |
| M2 | Manual expense entry, category dashboard, `expensesRepo.ts` |
| M3 | Indian Bank/UPI SMS parser engine, Parser Lab in Settings |
| M4 | Friends & Groups CRUD, segmented Groups/Friends screen |
| M5 | Itemized order entry, autocomplete catalog, `+ / −` stepper, expense detail |
| M6 | Per-item splitting, proportional fees, settle toggle, WhatsApp share, group dues |
| M7 | Bill/receipt OCR via Gemini API, Demo Bill, Settings API key config |
| **M8** | **Native Notification Listener (Kotlin), auto-capture pipeline, EAS APK build config** |

## 8. Next Steps (Milestone 9 Candidates)
1. **Polish & Bug Fixes** — Full end-to-end testing on a real device with live bank notifications.
2. **Monthly Reports / Export** — PDF or CSV export of expenses, monthly summary charts.
3. **Settlement History** — Track who settled when, payment confirmation flow.
4. **Recurring Expenses** — Detect & flag recurring subscriptions from notification patterns.
