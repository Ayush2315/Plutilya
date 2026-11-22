import type { ExpenseSource } from '../types/models';

// ─── Parsed result ───────────────────────────────────────────────────
export interface ParsedTransaction {
  amount: number;
  merchant: string;
  app_name: string | null;
  category: string;
  raw_text: string;
}

// ─── Merchant → App + Category mapping ───────────────────────────────
interface MerchantRule {
  pattern: RegExp;
  app_name: string | null;
  category: string;
}

const MERCHANT_RULES: MerchantRule[] = [
  // Food
  { pattern: /zepto/i,       app_name: 'Zepto',      category: 'food' },
  { pattern: /blinkit/i,     app_name: 'Blinkit',    category: 'food' },
  { pattern: /swiggy/i,      app_name: 'Swiggy',     category: 'food' },
  { pattern: /zomato/i,      app_name: 'Zomato',     category: 'food' },
  { pattern: /instamart/i,   app_name: 'Swiggy',     category: 'food' },
  { pattern: /domino/i,      app_name: 'Dominos',    category: 'food' },
  { pattern: /mcdonald/i,    app_name: 'McDonalds',  category: 'food' },
  { pattern: /cafe/i,        app_name: null,          category: 'food' },
  { pattern: /restaurant/i,  app_name: null,          category: 'food' },
  { pattern: /dunkin/i,      app_name: null,          category: 'food' },
  { pattern: /starbucks/i,   app_name: null,          category: 'food' },
  { pattern: /biryani/i,     app_name: null,          category: 'food' },

  // Shopping
  { pattern: /amazon/i,      app_name: 'Amazon',     category: 'shopping' },
  { pattern: /flipkart/i,    app_name: 'Flipkart',   category: 'shopping' },
  { pattern: /myntra/i,      app_name: 'Myntra',     category: 'shopping' },
  { pattern: /ajio/i,        app_name: 'Ajio',       category: 'shopping' },
  { pattern: /nykaa/i,       app_name: 'Nykaa',      category: 'shopping' },
  { pattern: /meesho/i,      app_name: 'Meesho',     category: 'shopping' },
  { pattern: /decathlon/i,   app_name: 'Decathlon',  category: 'shopping' },
  { pattern: /croma/i,       app_name: 'Croma',      category: 'shopping' },
  { pattern: /reliance/i,    app_name: null,          category: 'shopping' },

  // Travel
  { pattern: /\buber\b/i,    app_name: 'Uber',       category: 'travel' },
  { pattern: /\bola\b/i,     app_name: 'Ola',        category: 'travel' },
  { pattern: /rapido/i,      app_name: 'Rapido',     category: 'travel' },
  { pattern: /irctc/i,       app_name: 'IRCTC',      category: 'travel' },
  { pattern: /makemytrip/i,  app_name: 'MakeMyTrip', category: 'travel' },
  { pattern: /\bmetro\b/i,   app_name: null,          category: 'travel' },
  { pattern: /petrol/i,      app_name: null,          category: 'travel' },
  { pattern: /\bshell\b/i,   app_name: null,          category: 'travel' },
  { pattern: /\bhpcl\b/i,    app_name: null,          category: 'travel' },
  { pattern: /\bbpcl\b/i,    app_name: null,          category: 'travel' },
  { pattern: /\biocl\b/i,    app_name: null,          category: 'travel' },
];

// ─── Ignore patterns (OTPs, credits, promos, login alerts) ──────────
const IGNORE_PATTERNS: RegExp[] = [
  /\botp\b/i,
  /\bverification\s*code\b/i,
  /\bcredited\b/i,
  /\breceived\b/i,
  /\brefund\b/i,
  /\bcashback\b/i,
  /\blogin\b/i,
  /\bsign[- ]?in\b/i,
  /\bpassword\b/i,
  /\bpromotion/i,
  /\boffer\b.*\bflat\b/i,
  /\bwin\b.*\bcashback\b/i,
  /\bdear customer.*activate/i,
  /\bemi\b.*\bapproved\b/i,
];

// ─── Amount extraction ───────────────────────────────────────────────
// Matches: Rs. 1,249.50 | Rs 450 | INR 1,200.00 | ₹85 | ₹ 1,500
const AMOUNT_RE =
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;

// ─── Merchant extraction patterns (tried in order) ──────────────────
const MERCHANT_PATTERNS: RegExp[] = [
  // "at <merchant> on" / "at <merchant>."
  /\bat\s+([A-Za-z0-9][\w\s&.'/-]{1,40}?)(?:\s+on\b|\s*\.|\s*$)/i,
  // "to <merchant> on" / "to <merchant>."
  /\bto\s+([A-Za-z0-9][\w\s&.'/-]{1,40}?)(?:\s+on\b|\s*\.|\s*$)/i,
  // "VPA <upi_id>"
  /\bVPA\s+([^\s]+)/i,
  // "Info: UPI/<txn_id>/<vpa>/<merchant>"
  /Info:\s*UPI\/[^/]*\/[^/]*\/([^/\s]+)/i,
  // "UPI-<merchant>" or "UPI/<merchant>"
  /\bUPI[-/]([A-Za-z0-9][\w\s&.'/-]{1,30})/i,
];

// ─── UPI handle cleanup ─────────────────────────────────────────────
function cleanMerchant(raw: string): string {
  let m = raw.trim();
  // Strip UPI handles: "zepto@ybl" → "zepto"
  m = m.replace(/@[\w.]+$/, '');
  // Strip trailing punctuation / dates
  m = m.replace(/[\s.,;:!]+$/, '');
  // Strip trailing "on dd" / "on dd/mm" fragments
  m = m.replace(/\s+on\s+\d{1,2}(\/\d{1,2})?(\/\d{2,4})?$/i, '');
  // Capitalize first letter of each word
  m = m
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return m || 'Unknown';
}

// ─── Main parser ─────────────────────────────────────────────────────
export function parseTransactionMessage(
  text: string,
): ParsedTransaction | null {
  // 1. Reject non-debit messages
  for (const re of IGNORE_PATTERNS) {
    if (re.test(text)) return null;
  }

  // Must contain a debit-like keyword
  const isDebit =
    /\bdebited\b/i.test(text) ||
    /\bdebit\b/i.test(text) ||
    /\bspent\b/i.test(text) ||
    /\bpaid\b/i.test(text) ||
    /\bpurchase\b/i.test(text) ||
    /\bwithdr/i.test(text) ||
    /\btransaction\b/i.test(text) ||
    /\btransfer(?:red)?\b/i.test(text) ||
    /\bsent\b/i.test(text) ||
    /\bcharged\b/i.test(text);
  if (!isDebit) return null;

  // 2. Extract amount
  const amtMatch = text.match(AMOUNT_RE);
  if (!amtMatch) return null;
  const amount = parseFloat(amtMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  // 3. Extract merchant
  let merchant = 'Unknown';
  for (const re of MERCHANT_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) {
      merchant = cleanMerchant(m[1]);
      break;
    }
  }

  // 4. Auto-detect app & category from full text + merchant
  let app_name: string | null = null;
  let category = 'miscellaneous';
  const searchText = `${text} ${merchant}`;
  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(searchText)) {
      app_name = rule.app_name;
      category = rule.category;
      break;
    }
  }

  return { amount, merchant, app_name, category, raw_text: text };
}
