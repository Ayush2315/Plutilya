// ─── Sample SMS / Notification messages for parser testing ───────────
export interface SampleMessage {
  label: string;
  text: string;
  shouldParse: boolean; // false = should be ignored
}

export const SAMPLE_MESSAGES: SampleMessage[] = [
  // ── 1. HDFC UPI debit → Swiggy (Food) ──
  {
    label: 'HDFC → Swiggy',
    text: 'HDFC Bank: Rs.349.00 debited from A/c **1234 on 22-11-24. UPI txn to swiggy@axisbank. Ref 433012345678. If not done by you, call 18002586161.',
    shouldParse: true,
  },
  // ── 2. SBI UPI debit → Zepto (Food) ──
  {
    label: 'SBI → Zepto',
    text: 'Dear Customer, your A/c X9876 is debited for Rs.1,249.50 on 22Nov24 transfer to Zepto VPA zepto@ybl. If not done by you call 1800112211. -SBI',
    shouldParse: true,
  },
  // ── 3. ICICI card at Amazon (Shopping) ──
  {
    label: 'ICICI → Amazon',
    text: 'ICICI Bank Credit Card XX4455 has been used for a transaction of INR 2,599.00 at Amazon on 22-Nov-2024. Available limit: INR 1,45,000.',
    shouldParse: true,
  },
  // ── 4. GPay notification → Uber (Travel) ──
  {
    label: 'GPay → Uber',
    text: 'You paid ₹185.00 to Uber India on Google Pay. UPI Ref: 433098765432. Debited from HDFC Bank A/c.',
    shouldParse: true,
  },
  // ── 5. PhonePe → Blinkit (Food) ──
  {
    label: 'PhonePe → Blinkit',
    text: 'Paid ₹432.00 to BLINKIT via PhonePe. Transaction ID: TXN20241122. Debited from ICICI Bank XX6789.',
    shouldParse: true,
  },
  // ── 6. Unknown local kirana (Miscellaneous) ──
  {
    label: 'Unknown shop',
    text: 'Rs 85 debited from your Kotak A/c XX3344 at RAVI KIRANA STORE on 22/11/24. Avl Bal Rs 12,450.00. Not you? Call 18002740110.',
    shouldParse: true,
  },
  // ── 7. OTP (should be ignored) ──
  {
    label: '🚫 OTP',
    text: '234567 is your OTP for login to HDFC Bank NetBanking. Valid for 5 mins. Do NOT share with anyone. - HDFC Bank',
    shouldParse: false,
  },
  // ── 8. Credit / Refund (should be ignored) ──
  {
    label: '🚫 Refund',
    text: 'Dear Customer, Rs.499.00 has been credited to your A/c XX5678 towards refund from Flipkart. Ref 433087654321. -ICICI Bank',
    shouldParse: false,
  },
];
