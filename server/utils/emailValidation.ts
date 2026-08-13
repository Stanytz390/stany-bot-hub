// Blocks disposable / fake email providers and enforces sane email hygiene.

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "10minutemail.com", "guerrillamail.com", "guerrillamail.net",
  "tempmail.com", "temp-mail.org", "tempmailo.com", "tempmail.net", "throwawaymail.com",
  "yopmail.com", "yopmail.fr", "sharklasers.com", "grr.la", "spam4.me",
  "getnada.com", "nada.email", "dispostable.com", "trashmail.com", "trashmail.de",
  "fakeinbox.com", "maildrop.cc", "mintemail.com", "mytemp.email", "moakt.com",
  "mohmal.com", "emailondeck.com", "tempr.email", "discard.email", "mailnesia.com",
  "inboxbear.com", "tmpmail.org", "tmpmail.net", "burnermail.io", "anonaddy.me",
  "1secmail.com", "1secmail.net", "1secmail.org", "email-temp.com", "linshiyouxiang.net",
  "mailcatch.com", "spambox.us", "vomoto.com", "byom.de", "dropmail.me",
  "harakirimail.com", "mail-temp.com", "tempmailaddress.com", "tempinbox.com",
  "instantemailaddress.com", "mailsac.com", "trbvm.com", "cock.li", "tempmail.plus",
]);

// Providers we trust for real users.
const TRUSTED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "yahoo.com", "yahoo.co.uk", "icloud.com", "me.com", "proton.me", "protonmail.com",
  "zoho.com", "aol.com", "gmx.com", "mail.com", "yandex.com",
]);

export interface EmailCheck {
  valid: boolean;
  reason?: string;
  normalized: string;
}

export function validateRealEmail(rawEmail: string): EmailCheck {
  const email = (rawEmail || "").trim().toLowerCase();
  const normalized = email;

  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
    return { valid: false, reason: "Email format is not valid", normalized };
  }

  const [localPart, domain] = email.split("@");

  if (localPart.length < 3) {
    return { valid: false, reason: "Email name is too short", normalized };
  }

  // Plus-addressing is commonly used to spin up unlimited fake accounts.
  if (localPart.includes("+")) {
    return { valid: false, reason: "Email aliases with '+' are not allowed", normalized };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: "Temporary / disposable emails are not allowed", normalized };
  }

  // Obvious throwaway patterns.
  if (/(^|\.)((temp|trash|fake|spam|throwaway|disposable|10minute|minutemail)[a-z0-9-]*)\./.test(domain + ".")) {
    return { valid: false, reason: "Temporary / disposable emails are not allowed", normalized };
  }

  if (domain.endsWith(".test") || domain.endsWith(".invalid") || domain.endsWith(".local") || domain.endsWith(".example")) {
    return { valid: false, reason: "This email domain is not a real mailbox", normalized };
  }

  // Gmail dot-trick normalisation so a.b.c@gmail == abc@gmail for uniqueness.
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return { valid: true, normalized: `${localPart.replace(/\./g, "")}@gmail.com` };
  }

  return { valid: true, normalized };
}

export function isTrustedProvider(email: string): boolean {
  const domain = (email || "").split("@")[1]?.toLowerCase() || "";
  return TRUSTED_DOMAINS.has(domain);
}
