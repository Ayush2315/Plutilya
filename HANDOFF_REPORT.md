# HANDOFF REPORT — Milestone 3 (Indian Bank/UPI SMS & Notification Parser Engine + Tester Lab)

## 1. Status: ✅ Completed

## 2. Files Created / Modified

| File | Summary |
|---|---|
| `src/services/smsParser.ts` | **NEW** — `ParsedTransaction` interface + `parseTransactionMessage()` parser with ignore filters, amount extraction (₹/Rs/INR), merchant extraction (5 patterns), UPI handle cleanup, and 30+ merchant→app+category auto-mapping rules |
| `src/services/smsParser.samples.ts` | **NEW** — 8 realistic Indian bank/UPI test messages (6 valid debits + 2 ignored: OTP & refund) |
| `src/db/expensesRepo.ts` | **MODIFIED** — `AddExpenseInput.source` is now optional (`ExpenseSource`, defaults to `'manual'`), enabling parsed SMS to be saved with `source: 'sms'` |
| `app/(tabs)/settings.tsx` | **REWRITTEN** — Full "Parser Lab" UI: multiline input, 8 quick-fill sample chips, Parse button, result card (Amount/Merchant/App/Category) or "Ignored" badge, Save to Plutilya button |

## 3. Parser Coverage Summary

### Ignore Filters (return `null`)
- OTPs, verification codes
- Credits, refunds, cashback
- Login/sign-in alerts
- Promotional spam

### Amount Formats Supported
| Format | Example |
|---|---|
| `Rs.` / `Rs` | `Rs.1,249.50`, `Rs 85` |
| `INR` | `INR 2,599.00` |
| `₹` | `₹185.00`, `₹ 1,500` |
| Comma-separated | `1,45,000` (Indian lakhs) |

### Merchant Extraction Patterns (tried in order)
1. `at <merchant> on/./EOL`
2. `to <merchant> on/./EOL`
3. `VPA <upi_id>` → strips `@ybl`, `@axisbank`, etc.
4. `Info: UPI/<txnid>/<vpa>/<merchant>`
5. `UPI-<merchant>` or `UPI/<merchant>`

### Auto-Categorization Rules (30+ patterns)

| Category | Merchants / Keywords |
|---|---|
| **Food** | Zepto, Blinkit, Swiggy, Zomato, Instamart, Dominos, McDonalds, Starbucks, Dunkin, Cafe, Restaurant, Biryani |
| **Shopping** | Amazon, Flipkart, Myntra, Ajio, Nykaa, Meesho, Decathlon, Croma, Reliance |
| **Travel** | Uber, Ola, Rapido, IRCTC, MakeMyTrip, Metro, Petrol, Shell, HPCL, BPCL, IOCL |
| **Miscellaneous** | Fallback for unknown merchants (`app_name: null`) |

### Sample Test Messages
| # | Label | Type | Expected Result |
|---|---|---|---|
| 1 | HDFC → Swiggy | Debit | ₹349.00, Swiggy, Food |
| 2 | SBI → Zepto | Debit | ₹1,249.50, Zepto, Food |
| 3 | ICICI → Amazon | Debit | ₹2,599.00, Amazon, Shopping |
| 4 | GPay → Uber | Debit | ₹185.00, Uber, Travel |
| 5 | PhonePe → Blinkit | Debit | ₹432.00, Blinkit, Food |
| 6 | Unknown shop | Debit | ₹85.00, Ravi Kirana Store, Miscellaneous |
| 7 | 🚫 OTP | Ignored | `null` |
| 8 | 🚫 Refund | Ignored | `null` |

## 4. Verification

```
✅ npx tsc --noEmit → 0 errors, 0 warnings
```

### Manual Test Steps
```bash
cd f:\Codec\plutilya
npx expo start --android
```
1. Open **Settings** tab → see "🧪 Parser Lab" header
2. Tap any **quick-fill chip** (e.g. "HDFC → Swiggy") → text area fills with sample SMS
3. Tap **"🔍 Parse Message"** → result card shows Amount ₹349.00, Merchant, App: Swiggy, Category: 🍔 Food
4. Tap **"💾 Save to Plutilya"** → alert confirms → button changes to ✅
5. Go to **Dashboard** → verify the saved expense appears in Recent + Food category
6. Tap **"🚫 OTP"** chip → Parse → shows red "Ignored — Not a debit transaction" badge
7. Paste any **real bank SMS** from your phone → Parse → verify extraction

## 5. Known Issues / Next Steps

- **No known issues.** Zero new dependencies — pure TypeScript regex engine running in-app.
- **Parser is extensible:** Add more patterns to `MERCHANT_RULES` array in `smsParser.ts` for additional merchants.
- **Milestone 4/5 candidates:**
  - Native SMS inbox reader (Android `ContentResolver` via custom native module or `expo-sms`)
  - Android Notification Listener Service (auto-capture GPay/PhonePe notifications)
  - Batch-import historical SMS through the parser
  - Group splitting / bill itemization UI
