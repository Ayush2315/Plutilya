export type BillCategory = 'Food' | 'Shopping' | 'Travel' | 'Miscellaneous';

export interface ParsedBillItem {
  item_name: string;
  unit_price: number;
  quantity: number;
}

export interface ParsedBillResult {
  merchant: string;
  app_name: string | null;
  category: BillCategory;
  total_amount: number;
  items: ParsedBillItem[];
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

const OCR_PROMPT = `You are a precise Indian receipt and app order screenshot parser.
Analyze the attached bill, invoice, or delivery/shopping app screenshot and extract structured expense data as strict JSON matching this exact schema:
{
  "merchant": "string",
  "app_name": "string or null",
  "category": "Food | Shopping | Travel | Miscellaneous",
  "total_amount": number,
  "items": [
    {
      "item_name": "string",
      "unit_price": number,
      "quantity": number
    }
  ]
}

Rules:
1. "merchant": Store, restaurant, or platform name (e.g., "Zepto", "Swiggy", "Dominos", "Amazon").
2. "app_name": If the screenshot is clearly from an Indian consumer app (e.g. "Zepto", "Blinkit", "Swiggy", "Zomato", "Amazon", "Flipkart", "Uber", "Rapido", "BigBasket", "Myntra"), set it to the clean capitalized app name; otherwise null.
3. "category": Strictly one of "Food", "Shopping", "Travel", "Miscellaneous". (Groceries, quick-commerce snacks/food, and restaurants are "Food".)
4. "total_amount": Final grand total paid in INR (after delivery fees, taxes, and discounts). Numeric only.
5. "items": Extract all purchased line items and any separate non-zero fees (like Delivery Fee, Handling Fee, Packaging Fee, GST).
   - Use the actual paid price per single unit for "unit_price" (if an item says Qty 2 and line price ₹80, unit_price is 40 and quantity is 2).
   - Ignore crossed-out/strikethrough MRP prices, savings banners, promo text, phone status bars, and UI buttons.
   - If no individual line items are readable on the receipt, return an empty array [].
6. Output valid JSON only.`;

const VALID_CATEGORIES: Record<string, BillCategory> = {
  food: 'Food',
  shopping: 'Shopping',
  travel: 'Travel',
  miscellaneous: 'Miscellaneous',
};

function normalizeCategory(raw: unknown): BillCategory {
  if (typeof raw !== 'string') return 'Miscellaneous';
  return VALID_CATEGORIES[raw.trim().toLowerCase()] ?? 'Miscellaneous';
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

/**
 * Sends a base64 bill/receipt image to Gemini REST API and returns validated expense + items.
 */
export async function extractBillFromImage(
  base64Image: string,
  mimeType: string,
  apiKey: string,
): Promise<ParsedBillResult> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('Gemini API key is not set. Add your key in the Settings tab.');
  }
  if (!base64Image) {
    throw new Error('Image data is empty. Please pick another image.');
  }

  let response: Response;
  try {
    response = await fetch(
      `${GEMINI_ENDPOINT}?key=${encodeURIComponent(trimmedKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: OCR_PROMPT },
                {
                  inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      },
    );
  } catch {
    throw new Error(
      'Network error while scanning bill. Please check your internet connection.',
    );
  }

  if (!response.ok) {
    let apiMessage = '';
    try {
      const errBody = (await response.json()) as { error?: { message?: string } };
      apiMessage = errBody?.error?.message ?? '';
    } catch {
      // ignore non-JSON error body
    }

    if (
      response.status === 400 ||
      response.status === 401 ||
      response.status === 403 ||
      /api key/i.test(apiMessage)
    ) {
      throw new Error(
        'Invalid or unauthorized Gemini API key. Please check your key in Settings.',
      );
    }
    if (response.status === 429) {
      throw new Error('Gemini API rate limit reached. Please try again in a moment.');
    }
    throw new Error(
      apiMessage || `Bill scan failed (HTTP ${response.status}). Please try again.`,
    );
  }

  let payload: {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  try {
    payload = await response.json();
  } catch {
    throw new Error('Received an invalid response from Gemini API.');
  }

  const rawText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error(
      'Could not read details from this image. Try a clearer receipt or order screenshot.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(rawText));
  } catch {
    throw new Error('Could not parse the scanned bill data. Please try another image.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Unparseable bill format returned by OCR.');
  }

  const record = parsed as Record<string, unknown>;

  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items: ParsedBillItem[] = rawItems
    .map((entry): ParsedBillItem | null => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as Record<string, unknown>;
      const name = typeof item.item_name === 'string' ? item.item_name.trim() : '';
      const unitPrice = Number(item.unit_price);
      const quantity = Number(item.quantity ?? 1);
      if (!name || !Number.isFinite(unitPrice) || unitPrice < 0) return null;
      return {
        item_name: name,
        unit_price: Math.round(unitPrice * 100) / 100,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      };
    })
    .filter((x): x is ParsedBillItem => x !== null);

  const rawTotal = Number(record.total_amount);
  const itemsSum = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const totalAmount =
    Number.isFinite(rawTotal) && rawTotal > 0
      ? Math.round(rawTotal * 100) / 100
      : Math.round(itemsSum * 100) / 100;

  if (totalAmount <= 0) {
    throw new Error('Could not detect a valid total amount on this bill.');
  }

  const merchant =
    typeof record.merchant === 'string' && record.merchant.trim().length > 0
      ? record.merchant.trim()
      : 'Scanned Bill';

  const appName =
    typeof record.app_name === 'string' && record.app_name.trim().length > 0
      ? record.app_name.trim()
      : null;

  return {
    merchant,
    app_name: appName,
    category: normalizeCategory(record.category),
    total_amount: totalAmount,
    items,
  };
}

/**
 * Sample Zepto order for testing the OCR-to-Itemized flow offline without an API key.
 */
export function getDemoZeptoBill(): ParsedBillResult {
  return {
    merchant: 'Zepto',
    app_name: 'Zepto',
    category: 'Food',
    total_amount: 215,
    items: [
      { item_name: "Lays India's Magic Masala", unit_price: 20, quantity: 1 },
      { item_name: 'Cadbury Dairy Milk Silk', unit_price: 80, quantity: 1 },
      { item_name: 'Coca-Cola 750ml', unit_price: 40, quantity: 2 },
      { item_name: 'Delivery & Handling Fee', unit_price: 35, quantity: 1 },
    ],
  };
}
