/**
 * Central registry of ad/banner platforms.
 * `slug` maps to simpleicons.org so every platform gets a real brand icon,
 * `cta` is the default button label, `color` the brand hex used for the button.
 */
export interface PlatformDef {
  id: string;
  label: string;
  /** simpleicons slug (https://cdn.simpleicons.org/<slug>) */
  slug: string;
  cta: string;
  color: string;
}

export const PLATFORMS: PlatformDef[] = [
  { id: "whatsapp", label: "WhatsApp", slug: "whatsapp", cta: "Chat on WhatsApp", color: "#25D366" },
  { id: "whatsapp_channel", label: "WhatsApp Channel", slug: "whatsapp", cta: "Follow Channel", color: "#128C7E" },
  { id: "telegram", label: "Telegram", slug: "telegram", cta: "Join Telegram", color: "#26A5E4" },
  { id: "youtube", label: "YouTube", slug: "youtube", cta: "Subscribe", color: "#FF0000" },
  { id: "facebook", label: "Facebook", slug: "facebook", cta: "Follow Page", color: "#1877F2" },
  { id: "instagram", label: "Instagram", slug: "instagram", cta: "Follow", color: "#E4405F" },
  { id: "tiktok", label: "TikTok", slug: "tiktok", cta: "Follow", color: "#010101" },
  { id: "x", label: "X (Twitter)", slug: "x", cta: "Follow", color: "#111111" },
  { id: "twitter", label: "Twitter", slug: "twitter", cta: "Follow", color: "#1DA1F2" },
  { id: "snapchat", label: "Snapchat", slug: "snapchat", cta: "Add on Snapchat", color: "#FFFC00" },
  { id: "linkedin", label: "LinkedIn", slug: "linkedin", cta: "Connect", color: "#0A66C2" },
  { id: "discord", label: "Discord", slug: "discord", cta: "Join Server", color: "#5865F2" },
  { id: "reddit", label: "Reddit", slug: "reddit", cta: "Join Subreddit", color: "#FF4500" },
  { id: "pinterest", label: "Pinterest", slug: "pinterest", cta: "Follow", color: "#BD081C" },
  { id: "threads", label: "Threads", slug: "threads", cta: "Follow", color: "#101010" },
  { id: "twitch", label: "Twitch", slug: "twitch", cta: "Watch Live", color: "#9146FF" },
  { id: "kick", label: "Kick", slug: "kick", cta: "Watch Live", color: "#53FC18" },
  { id: "spotify", label: "Spotify", slug: "spotify", cta: "Listen Now", color: "#1DB954" },
  { id: "applemusic", label: "Apple Music", slug: "applemusic", cta: "Listen Now", color: "#FA243C" },
  { id: "soundcloud", label: "SoundCloud", slug: "soundcloud", cta: "Listen Now", color: "#FF5500" },
  { id: "audiomack", label: "Audiomack", slug: "audiomack", cta: "Stream Now", color: "#FFA200" },
  { id: "boomplay", label: "Boomplay", slug: "boomplay", cta: "Stream Now", color: "#E8202A" },
  { id: "deezer", label: "Deezer", slug: "deezer", cta: "Listen Now", color: "#A238FF" },
  { id: "github", label: "GitHub", slug: "github", cta: "View Repo", color: "#181717" },
  { id: "gitlab", label: "GitLab", slug: "gitlab", cta: "View Repo", color: "#FC6D26" },
  { id: "heroku", label: "Heroku", slug: "heroku", cta: "Deploy Now", color: "#430098" },
  { id: "render", label: "Render", slug: "render", cta: "Deploy Now", color: "#46E3B7" },
  { id: "railway", label: "Railway", slug: "railway", cta: "Deploy Now", color: "#0B0D0E" },
  { id: "vercel", label: "Vercel", slug: "vercel", cta: "Deploy Now", color: "#000000" },
  { id: "netlify", label: "Netlify", slug: "netlify", cta: "Deploy Now", color: "#00C7B7" },
  { id: "cloudflare", label: "Cloudflare", slug: "cloudflare", cta: "Learn More", color: "#F38020" },
  { id: "digitalocean", label: "DigitalOcean", slug: "digitalocean", cta: "Learn More", color: "#0080FF" },
  { id: "aws", label: "AWS", slug: "amazonaws", cta: "Learn More", color: "#232F3E" },
  { id: "googleplay", label: "Google Play", slug: "googleplay", cta: "Get the App", color: "#414141" },
  { id: "appstore", label: "App Store", slug: "appstore", cta: "Get the App", color: "#0D96F6" },
  { id: "amazon", label: "Amazon", slug: "amazon", cta: "Shop Now", color: "#FF9900" },
  { id: "aliexpress", label: "AliExpress", slug: "aliexpress", cta: "Shop Now", color: "#FF4747" },
  { id: "jumia", label: "Jumia", slug: "jumia", cta: "Shop Now", color: "#F68B1E" },
  { id: "shopify", label: "Shopify", slug: "shopify", cta: "Shop Now", color: "#7AB55C" },
  { id: "etsy", label: "Etsy", slug: "etsy", cta: "Shop Now", color: "#F16521" },
  { id: "paypal", label: "PayPal", slug: "paypal", cta: "Pay with PayPal", color: "#00457C" },
  { id: "binance", label: "Binance", slug: "binance", cta: "Trade Now", color: "#F0B90B" },
  { id: "bybit", label: "Bybit", slug: "bybit", cta: "Trade Now", color: "#F7A600" },
  { id: "coinbase", label: "Coinbase", slug: "coinbase", cta: "Trade Now", color: "#0052FF" },
  { id: "bitcoin", label: "Bitcoin", slug: "bitcoin", cta: "Learn More", color: "#F7931A" },
  { id: "mpesa", label: "M-Pesa", slug: "vodafone", cta: "Pay with M-Pesa", color: "#E60000" },
  { id: "airtel", label: "Airtel Money", slug: "airtel", cta: "Pay with Airtel", color: "#E40000" },
  { id: "tigo", label: "Mixx by Yas", slug: "yandex", cta: "Pay Now", color: "#0033A0" },
  { id: "bet365", label: "Bet365", slug: "bet365", cta: "Bet Now", color: "#027B5B" },
  { id: "betway", label: "Betway", slug: "betway", cta: "Bet Now", color: "#00A826" },
  { id: "1xbet", label: "1xBet", slug: "1and1", cta: "Bet Now", color: "#0A5C36" },
  { id: "betting", label: "Betting", slug: "sportradar", cta: "Bet Now", color: "#1B7F3B" },
  { id: "gmail", label: "Gmail", slug: "gmail", cta: "Email Us", color: "#EA4335" },
  { id: "medium", label: "Medium", slug: "medium", cta: "Read Article", color: "#000000" },
  { id: "substack", label: "Substack", slug: "substack", cta: "Subscribe", color: "#FF6719" },
  { id: "patreon", label: "Patreon", slug: "patreon", cta: "Support Us", color: "#F96854" },
  { id: "kofi", label: "Ko-fi", slug: "kofi", cta: "Buy a Coffee", color: "#FF5E5B" },
  { id: "quora", label: "Quora", slug: "quora", cta: "Read More", color: "#B92B27" },
  { id: "stackoverflow", label: "Stack Overflow", slug: "stackoverflow", cta: "View Answer", color: "#F58025" },
  { id: "zoom", label: "Zoom", slug: "zoom", cta: "Join Meeting", color: "#0B5CFF" },
  { id: "slack", label: "Slack", slug: "slack", cta: "Join Workspace", color: "#4A154B" },
  { id: "signal", label: "Signal", slug: "signal", cta: "Message Us", color: "#3A76F0" },
  { id: "viber", label: "Viber", slug: "viber", cta: "Message Us", color: "#7360F2" },
  { id: "wechat", label: "WeChat", slug: "wechat", cta: "Add on WeChat", color: "#07C160" },
  { id: "line", label: "LINE", slug: "line", cta: "Add on LINE", color: "#00C300" },
  { id: "messenger", label: "Messenger", slug: "messenger", cta: "Message Us", color: "#00B2FF" },
  { id: "skype", label: "Skype", slug: "skype", cta: "Call Us", color: "#00AFF0" },
  { id: "vimeo", label: "Vimeo", slug: "vimeo", cta: "Watch Now", color: "#1AB7EA" },
  { id: "dailymotion", label: "Dailymotion", slug: "dailymotion", cta: "Watch Now", color: "#0066DC" },
  { id: "netflix", label: "Netflix", slug: "netflix", cta: "Watch Now", color: "#E50914" },
  { id: "udemy", label: "Udemy", slug: "udemy", cta: "Enroll Now", color: "#A435F0" },
  { id: "coursera", label: "Coursera", slug: "coursera", cta: "Enroll Now", color: "#0056D2" },
  { id: "website", label: "Website", slug: "googlechrome", cta: "Visit Website", color: "#4285F4" },
];

export const PLATFORM_MAP: Record<string, PlatformDef> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p]),
);

export const DEFAULT_PLATFORM: PlatformDef = PLATFORM_MAP.website;

export function getPlatform(id?: string): PlatformDef {
  if (!id) return DEFAULT_PLATFORM;
  return PLATFORM_MAP[id.toLowerCase()] || DEFAULT_PLATFORM;
}

export function platformIcon(p: PlatformDef): string {
  return `https://cdn.simpleicons.org/${p.slug}/ffffff`;
}
