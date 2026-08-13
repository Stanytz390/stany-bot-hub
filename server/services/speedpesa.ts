const SPEEDPESA_API_KEY = process.env.SPEEDPESA_API_KEY || "";
const SPEEDPESA_API_URL = process.env.SPEEDPESA_API_URL || "https://speedpesa.com/api/v1";

// ============================================================
// 1. PHONE NUMBER HELPERS
// ============================================================
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("255") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "255" + digits.slice(1);
  if (digits.length === 9) return "255" + digits;
  return digits;
}

export function isValidTanzanianPhone(phone: string): boolean {
  return /^255\d{9}$/.test(normalizePhone(phone));
}

// ============================================================
// 2. FORMAT PHONE FOR DISPLAY
// ============================================================
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  // 255712345678 -> 0712345678
  if (normalized.startsWith("255")) {
    return "0" + normalized.slice(3);
  }
  return phone;
}

// ============================================================
// 3. INITIATE PAYMENT – FIXED (use phonenumber)
// ============================================================
export interface MobilePayinResult {
  success: boolean;
  reference?: string;
  message?: string;
}

export async function initiateMobilePayin(params: {
  phone: string;
  amount: number;
  reference: string;
}): Promise<MobilePayinResult> {
  try {
    // ✅ FIX: SpeedPesa inataka "phonenumber" (lowercase, no camelCase)
    const payload = {
      phonenumber: params.phone,  // ✅ "phonenumber" not "phoneNumber"
      amount: params.amount.toString(),
    };

    console.log("📤 SpeedPesa Payload:", JSON.stringify(payload, null, 2));

    const res = await fetch(`${SPEEDPESA_API_URL}/mobilepayin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": SPEEDPESA_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log("📥 SpeedPesa Response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text || "Unknown error" };
    }

    if (!res.ok) {
      let errorMsg = "Payment initiation failed";
      if (data.message) {
        errorMsg = data.message;
        errorMsg = errorMsg.replace(/^(type|error|message|data)\s*[: ]*/i, "");
      }
      return { success: false, message: errorMsg };
    }

    return {
      success: true,
      reference: data.data?.reference || params.reference,
      message: data.message || "Check your phone for the payment prompt.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    console.error("🔥 initiateMobilePayin error:", err);
    return { success: false, message: msg };
  }
}

// ============================================================
// 4. CHECK TRANSACTION STATUS
// ============================================================
export interface StatusResult {
  status: string;
  channelProvider?: string;
  accountName?: string;
  phoneNumber?: string;
  completedAt?: string;
}

export async function getTransactionStatus(reference: string): Promise<StatusResult> {
  try {
    const res = await fetch(`${SPEEDPESA_API_URL}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": SPEEDPESA_API_KEY,
      },
      body: JSON.stringify({ reference }),
    });

    const text = await res.text();
    console.log("📥 Status response:", text);

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response");
    }

    if (!res.ok) {
      throw new Error(json.message || `Status check failed: ${res.status}`);
    }

    const data = json.data || {};
    const status = (data.status || "PENDING").toUpperCase();

    return {
      status,
      channelProvider: data.channelprovider || data.channelProvider,
      accountName: data.accountname || data.accountName,
      phoneNumber: data.accountnumber || data.phoneNumber || data.phonenumber,
      completedAt: data.completed || data.completedAt,
    };
  } catch (err) {
    console.error("🔥 getTransactionStatus error:", err);
    return { status: "PENDING" };
  }
}

// ============================================================
// 5. CHECK BALANCE
// ============================================================
export async function getBalance(): Promise<{ currency: string; balance: string } | null> {
  try {
    const res = await fetch(`${SPEEDPESA_API_URL}/balance`, {
      method: "GET",
      headers: {
        "x-api-key": SPEEDPESA_API_KEY,
      },
    });
    const text = await res.text();
    const json = JSON.parse(text);
    if (json.type === "success" && json.data?.balances?.TZS) {
      return {
        currency: "TZS",
        balance: json.data.balances.TZS.balance,
      };
    }
    return null;
  } catch {
    return null;
  }
}