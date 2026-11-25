# HANDOFF REPORT — Milestone 7: Screenshot / Bill OCR Pipeline → Auto-Fill Itemized Expense

## 1. Status
**Completed** — `npx tsc --noEmit` passed with **0 errors**, and `expo-image-picker` (`~58.0.10`) is installed while maintaining full Expo Go compatibility.

## 2. Files Created / Modified

| # | File | Action | Summary |
|---|------|--------|---------|
| 1 | `package.json` (and `package-lock.json`) | **Modified** | Installed `expo-image-picker` (`~58.0.10`) compatible with Expo SDK 58 / Expo Go. |
| 2 | `src/db/schema.ts` | **Modified** | Added `CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT);` while keeping all 6 existing tables untouched. |
| 3 | `src/db/settingsRepo.ts` | **Created** | Lightweight SQLite key-value store exporting `getSetting(key)` and `setSetting(key, value)`. |
| 4 | `src/services/billOcr.ts` | **Created** | Gemini REST OCR service exporting `ParsedBillResult`, `extractBillFromImage(base64Image, mimeType, apiKey)`, and `getDemoZeptoBill()`. |
| 5 | `app/(tabs)/settings.tsx` | **Modified** | Added the **"📷 Bill Scanner (OCR) Setup"** card above Parser Lab with a masked Gemini API key input, `Save Key` action, and `✅ Key saved` / `⚠️ No key set` status. |
| 6 | `app/(tabs)/add-expense.tsx` | **Modified** | Added the **"Scan Bill / Screenshot"** bar (`Screenshot / Gallery`, `Camera`, `Demo Bill`), thumbnail + loading state (`"Extracting items..."`), missing-key prompt, auto-population of M5 itemized UI, and `source: 'ocr'` persistence. |

*(Note: `src/db/itemsRepo.ts` already accepted optional `source?: ExpenseSource` via `AddExpenseInput` and stores `'ocr'` directly when passed from `add-expense.tsx`.)*

## 3. Key Functions / Services Added

### Settings Store (`src/db/settingsRepo.ts`)
- `getSetting(key: string): Promise<string | null>` — Reads a persisted setting from `app_settings` (returns `null` if unset/empty).
- `setSetting(key: string, value: string): Promise<void>` — Upserts a setting into `app_settings` (`ON CONFLICT(key) DO UPDATE`).

### Bill OCR Service (`src/services/billOcr.ts`)
- `ParsedBillResult` — `{ merchant, app_name, category, total_amount, items: { item_name, unit_price, quantity }[] }`.
- `extractBillFromImage(base64Image, mimeType, apiKey)` — Sends a `fetch` POST request to `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent` with `responseMimeType: "application/json"`, validates and normalizes the extracted JSON, and throws clear human-readable errors for invalid keys, rate limits, network errors, or unreadable bills.
- `getDemoZeptoBill()` — Returns a deterministic sample Zepto order (`₹215` across Lays, Cadbury Dairy Milk Silk, Coca-Cola 750ml ×2, and Delivery & Handling Fee) for offline testing without an API key.

### UI Flows
- **Settings (`app/(tabs)/settings.tsx`)**: Loads/saves `gemini_api_key` via `settingsRepo` using `secureTextEntry` and displays key availability status above Parser Lab.
- **Add Expense (`app/(tabs)/add-expense.tsx`)**: Handles camera/gallery permissions and base64 image picking (`quality: 0.7`), prompts to configure the API key in Settings if missing, populates `merchant`, `category`, `app_name`, `total_amount` (preserving total even when fees/discounts differ from item sums), toggles **Itemize Order ON**, populates line items into the `+ / −` stepper list, and saves with `source: 'ocr'`.

## 4. Verification
- **TypeScript Check:** `npx tsc --noEmit` in `f:\Codec\plutilya` exited with code `0` (**0 errors**).
- **Manual Test Steps (Expo Go):**
  1. **Demo Bill (Offline):** Open **Add Expense** → tap **✨ Demo Bill** → verify **Zepto**, category **Food**, app **Zepto**, total **₹215.00**, and 4 itemized rows populate with **Itemize Order** toggled ON → adjust quantities or tap **Save Expense** → verify it saves cleanly (with `source = 'ocr'`) and can be split in Expense Details.
  2. **Missing Key Guard:** Ensure **Settings** shows `⚠️ No key set` → in **Add Expense**, tap **🖼️ Screenshot / Gallery** and pick an image → verify alert prompts to add your key in **Settings** (or use Demo Bill).
  3. **Real Image / Camera Scan:** Open **Settings** → paste a Google AI Studio Gemini API key in **📷 Bill Scanner (OCR) Setup** → tap **Save Key** → verify status switches to `✅ Key saved` → return to **Add Expense** → tap **🖼️ Screenshot / Gallery** or **📷 Camera** with an order screenshot or paper receipt → verify thumbnail preview + `"Extracting items..."` spinner → verify extracted merchant, app, category, total, and editable items populate → save and inspect in Dashboard/Expense Details.

## 5. Known Issues / Next Steps
- **Note on `npm install` peer deps:** `expo-image-picker` was installed with `--legacy-peer-deps` due to an existing `react@19.3.0` vs `react-dom@19.3.1` peer conflict in `@expo/dom-webview` / `@radix-ui` dependencies. No impact on runtime or TypeScript compilation.
- **Next Steps (Milestone 8 — Native Android Notification/SMS Listener + APK Build):**
  1. Transition from Expo Go to an **Expo Development Build / EAS Build** (`expo-dev-client` + `android.permissions`).
  2. Wire a native Android Notification / SMS listener service into the existing `parseTransactionMessage()` engine (`src/services/smsParser.ts`) for automatic real-time expense capture (`source: 'sms'` / `'notification'`).
  3. Generate a release/preview **Android APK** via EAS Build.
