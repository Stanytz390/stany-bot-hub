import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Zap,
  BookOpen,
  Shield,
  Repeat2,
  Users,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Server,
  Crown,
  Sparkles,
  MessageCircle,
  Code2,
  Copy,
  Check,
  Terminal,
  Coins,
  Globe,
  ExternalLink,
} from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

interface Section {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: FAQItem[];
}

const FAQ_SECTIONS: Section[] = [
  {
    icon: Zap,
    title: "Getting Started",
    items: [
      {
        q: "How do I get started with Stany Host Nexus?",
        a: "Sign up for a free account via the Signup page. As soon as you join, you receive a free starter bonus of 2 SQ. Once logged in, top up your SQ Wallet (1 SQ = 100 TSh) via M-Pesa, TigoPesa, or Airtel Money to deploy WhatsApp bots, purchase high-speed game server panels, buy digital PC/Android games, or access our Developer REST API.",
      },
      {
        q: "How do I deploy a WhatsApp bot for the first time?",
        a: "From the navigation menu, go to Services → Bot Deployment. Select your preferred bot template (such as MdinyaneV2, SubZero, or Queen Anita). Click 'Deploy', get your Session ID via the pairing link, provide a name for your bot, choose your operating mode (Android supports button lists; iOS is text-only), and click Deploy. Your bot will be active 24/7 within 2 minutes.",
      },
      {
        q: "Where do I obtain my Session ID?",
        a: "Every bot template provides a 'Get Session ID' button linking to the pairing service. Enter your phone number with your international dialing code, complete the WhatsApp QR or 8-digit verification code, and copy the full session string directly into the deployment form.",
      },
      {
        q: "What is the difference between Android and iOS modes?",
        a: "Android mode supports full interactive menu buttons and quick-reply action triggers. iOS mode uses text-command menus. Android is strongly recommended for modern interactive bots.",
      },
    ],
  },
  {
    icon: Coins,
    title: "SQ Coins & Billing (1 SQ = 100 TSh)",
    items: [
      {
        q: "What are SQ Coins and what is their exchange rate?",
        a: "SQ Coins are the unified internal currency of Stany Host Nexus. The official exchange rate is fixed at 1 SQ = 100 TSh (Tanzanian Shillings). For example: 10 SQ = 1,000 TSh, 50 SQ = 5,000 TSh, and 100 SQ = 10,000 TSh. Your SQ balance never expires.",
      },
      {
        q: "How do I top up my SQ Wallet balance?",
        a: "Navigate to the Top Up page (/topup). Enter your mobile phone number (Vodacom M-Pesa, Tigo, Airtel, or Halotel). Enter the desired SQ amount (1 SQ = 100 TSh). You will receive an instant STK push prompt on your mobile phone to approve with your PIN. Your balance updates automatically within seconds.",
      },
      {
        q: "How much does hosting a WhatsApp Bot cost?",
        a: "Standard WhatsApp bots cost 10 SQ (~1,000 TSh) for one full month of continuous 24/7 uptime without needing your phone turned on. Specific advanced templates indicate their exact cost prior to deployment confirmation.",
      },
      {
        q: "Can I transfer SQ coins to another user?",
        a: "Yes! Use the Send Coins service (/send-coins) to transfer SQ coins instantly to any registered user on Stany Host Nexus with zero transaction fees.",
      },
    ],
  },
  {
    icon: Server,
    title: "Server & Pterodactyl Panels",
    items: [
      {
        q: "What is a Pterodactyl Panel?",
        a: "A Pterodactyl panel provides a dedicated cloud server container with allocated RAM (1GB up to 16GB), high-performance NVMe SSD storage, an interactive real-time web console, and the ability to run Node.js apps, Python bots, Minecraft, or WhatsApp bots 24/7 without interruption.",
      },
      {
        q: "How do I purchase a Panel?",
        a: "Go to Services → Panels → Purchase Panels (/services/panels/purchasepanel). Select your required plan (starting from 5 SQ = 500 TSh). The SQ amount will be deducted from your wallet and your server login credentials (Panel Username & Password) will be displayed immediately.",
      },
      {
        q: "Are panel purchases one-time or monthly?",
        a: "Standard panels operate on flexible monthly plans with guaranteed 24/7 uptime and 1-click renewal options from your dashboard.",
      },
      {
        q: "What does Admin Panel Access include?",
        a: "The Admin Panel tier grants full root administrative authority over the Pterodactyl cluster: create new game servers, configure nodes, manage allocations, and manage sub-users.",
      },
    ],
  },
  {
    icon: Repeat2,
    title: "Bot Management & Lifecycle",
    items: [
      {
        q: "How do I restart or stop my bot?",
        a: "From the My Bots page (/mybots), every bot card includes instant Start, Stop, and Restart controls. Use these controls to maintain or cycle your bot.",
      },
      {
        q: "What should I do if WhatsApp logs my session out?",
        a: "Click 'Edit' on your bot card, generate a new Session ID using the pairing link, paste the new session string, and click Save & Restart. Your bot will reconnect immediately without losing any configuration.",
      },
      {
        q: "How do I view live bot logs?",
        a: "Click the 'Logs' button on your bot card to inspect the real-time terminal stream and diagnose errors or review incoming commands.",
      },
    ],
  },
  {
    icon: Users,
    title: "Coupons & Referrals",
    items: [
      {
        q: "How do I redeem coupon codes?",
        a: "From your Dashboard, click 'Coupon Code', paste your promotional code, and click Claim to receive instant bonus SQ coins.",
      },
      {
        q: "How does the referral system work?",
        a: "Share your unique referral link with friends. When someone registers through your link, both of you immediately receive 2 SQ bonus coins credited to your wallets.",
      },
    ],
  },
  {
    icon: Crown,
    title: "Admin Panel & Reseller Access",
    items: [
      {
        q: "What privileges come with Admin Panel Access?",
        a: "Admin Panel status gives you complete administrator privileges across the Pterodactyl cluster: spin up new nodes, assign allocations, and manage client instances without restrictions.",
      },
      {
        q: "Can I use Admin Panel alongside my regular user account?",
        a: "Yes. Admin privileges attach seamlessly to your panel user profile while you continue using the standard Nexus dashboard.",
      },
    ],
  },
  {
    icon: Shield,
    title: "Security & Account Safety",
    items: [
      {
        q: "Is my WhatsApp Session ID kept secure?",
        a: "Yes. All session tokens are stored with high-grade cryptographic encryption and are never disclosed publicly or shared with third parties.",
      },
      {
        q: "How do I contact customer support?",
        a: "Visit the Contact page (/contact) or message our dedicated team directly via WhatsApp or Telegram for 24/7 technical assistance.",
      },
    ],
  },
];

const API_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/me",
    cost: "1 call",
    desc: "Returns your profile information, username, email, and live SQ wallet balance.",
  },
  {
    method: "GET",
    path: "/api/v1/balance",
    cost: "Free",
    desc: "Quickly checks your SQ coin balance (ideal for health checks and wallet monitors).",
  },
  {
    method: "GET",
    path: "/api/v1/bots",
    cost: "1 call",
    desc: "Returns the complete list of your deployed WhatsApp bots, statuses, and expiration dates.",
  },
  {
    method: "POST",
    path: "/api/v1/deploy",
    cost: "10 SQ / mo",
    desc: "Deploys a WhatsApp bot programmatically: payload accepts template_id, app_name, and session.",
  },
  {
    method: "POST",
    path: "/api/v1/bots/:id/restart",
    cost: "Free",
    desc: "Restarts an active bot instance within seconds via API without using the web UI.",
  },
  {
    method: "GET",
    path: "/api/v1/panels/plans",
    cost: "Free",
    desc: "Retrieves all available Game Panel plans (RAM, CPU, NVMe SSD) and their SQ pricing.",
  },
  {
    method: "POST",
    path: "/api/v1/panels/order",
    cost: "SQ Plan Cost",
    desc: "Provisions a Pterodactyl Panel server automatically; credentials are returned instantly.",
  },
  {
    method: "GET",
    path: "/api/v1/services",
    cost: "Free",
    desc: "Lists available SMM growth services (Telegram, TikTok, WhatsApp followers & views).",
  },
  {
    method: "POST",
    path: "/api/v1/services/order",
    cost: "SMM Rate",
    desc: "Submits an automated social media growth order for followers or views.",
  },
];

export function Docs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"guides" | "api">("guides");
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [selectedSnippet, setSelectedSnippet] = useState<"curl" | "node" | "python">("curl");
  const [copiedCode, setCopiedCode] = useState(false);

  const toggleItem = (q: string) => {
    setOpenItems((prev) => ({ ...prev, [q]: !prev[q] }));
  };

  const codeSnippets = {
    curl: `# 1. Check SQ Wallet Balance (Official Rate: 1 SQ = 100 TSh)
curl -X GET "https://host.stanymaxhub.online/api/v1/me" \\
  -H "Authorization: Bearer YOUR_STANY_API_KEY"

# 2. Deploy WhatsApp Bot via REST API
curl -X POST "https://host.stanymaxhub.online/api/v1/deploy" \\
  -H "Authorization: Bearer YOUR_STANY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "67...abc",
    "app_name": "my-cool-bot",
    "session": "YOUR_SESSION_ID_STRING",
    "months": 1
  }'`,
    node: `// Node.js (v18+ with native fetch)
const API_KEY = "YOUR_STANY_API_KEY";
const BASE_URL = "https://host.stanymaxhub.online/api/v1";

async function getBalance() {
  const response = await fetch(\`\${BASE_URL}/me\`, {
    headers: {
      "Authorization": \`Bearer \${API_KEY}\`,
      "Content-Type": "application/json"
    }
  });

  const data = await response.json();
  console.log("Account:", data.username);
  console.log("SQ Balance:", data.txCoins, "SQ (~" + (data.txCoins * 100) + " TSh)");
}

getBalance();`,
    python: `# Python 3 with requests
import requests

API_KEY = "YOUR_STANY_API_KEY"
BASE_URL = "https://host.stanymaxhub.online/api/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Fetch account profile and balance
res = requests.get(f"{BASE_URL}/me", headers=headers)
profile = res.json()

print("User:", profile.get("username"))
print("SQ Balance:", profile.get("txCoins"), "SQ")
print("Value in TSh:", profile.get("txCoins", 0) * 100, "TSh")`,
  };

  const copyCode = () => {
    navigator.clipboard.writeText(codeSnippets[selectedSnippet]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredFaqs = search.trim()
    ? FAQ_SECTIONS.flatMap((sec) =>
        sec.items
          .filter(
            (item) =>
              item.q.toLowerCase().includes(search.toLowerCase()) ||
              item.a.toLowerCase().includes(search.toLowerCase())
          )
          .map((item) => ({ ...item, sectionTitle: sec.title, Icon: sec.icon }))
      )
    : null;

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-100 flex flex-col selection:bg-[#1ed760]/30 selection:text-[#1ed760]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#121212]/95 backdrop-blur-md border-b border-[#282828]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#282828] active:scale-95 transition"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1ed760]/10 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760]">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-white leading-tight">
                  Stany Nexus Docs & Developer API
                </h1>
                <p className="text-[11px] text-zinc-400 font-mono">Official Rate: 1 SQ = 100 TSh</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/api-keys"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181818] hover:bg-[#242424] text-xs font-semibold text-zinc-200 border border-[#282828] transition"
            >
              <Code2 className="w-3.5 h-3.5 text-[#1ed760]" />
              <span>Manage API Keys</span>
            </Link>
            <Link
              to="/topup"
              className="px-3.5 py-1.5 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black text-xs font-bold shadow-md shadow-[#1ed760]/20 active:scale-95 transition"
            >
              Top Up Wallet
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Hero Banner (Spotify Modern Dark) */}
        <section className="mb-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#181818] via-[#141414] to-[#121212] border border-[#282828] relative overflow-hidden shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1ed760]/10 border border-[#1ed760]/30 text-[#1ed760] text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Documentation & Developer Hub</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Complete Guide & Developer REST API
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
                Learn how to deploy WhatsApp bots, configure high-performance Game Panels, understand the SQ Coins billing system (1 SQ = 100 TSh), and connect your external services via our Developer REST API.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#101216] border border-[#282828] text-right shrink-0">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">
                Official Currency Rate
              </span>
              <span className="text-xl font-mono font-extrabold text-[#1ed760] block">
                1 SQ = 100 TSh
              </span>
              <span className="text-[11px] text-zinc-500">M-Pesa · Tigo · Airtel · Halotel</span>
            </div>
          </div>

          {/* Navigation Tabs (Spotify Styled) */}
          <div className="flex items-center gap-2 mt-6 pt-5 border-t border-[#282828]">
            <button
              onClick={() => setActiveTab("guides")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition ${
                activeTab === "guides"
                  ? "bg-[#1ed760] text-black shadow-md shadow-[#1ed760]/20"
                  : "bg-[#181818] text-zinc-300 hover:text-white border border-[#282828]"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Guides & FAQ
            </button>
            <button
              onClick={() => setActiveTab("api")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition ${
                activeTab === "api"
                  ? "bg-[#1ed760] text-black shadow-md shadow-[#1ed760]/20"
                  : "bg-[#181818] text-zinc-300 hover:text-white border border-[#282828]"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Developer REST API v1
            </button>
          </div>
        </section>

        {/* TAB 1: GUIDES & FAQS */}
        {activeTab === "guides" && (
          <div className="space-y-6">
            {/* Search FAQ */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search guides and FAQs (e.g., session, pterodactyl, 100 tsh, bot, logs)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#181818] border border-[#282828] rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#1ed760] transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filtered Search Results */}
            {filteredFaqs !== null ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400">
                  Search results for &quot;<strong className="text-white">{search}</strong>&quot;:
                </p>
                {filteredFaqs.length === 0 ? (
                  <div className="text-center py-12 rounded-xl bg-[#181818] border border-[#282828]">
                    <HelpCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400">No matching results found.</p>
                  </div>
                ) : (
                  filteredFaqs.map((faq, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-[#181818] border border-[#282828] hover:border-[#1ed760]/40 transition"
                    >
                      <div className="flex items-center gap-2 text-[10px] text-[#1ed760] font-semibold mb-1 uppercase tracking-wider">
                        <faq.Icon className="w-3 h-3" />
                        <span>{faq.sectionTitle}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1.5">{faq.q}</h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">{faq.a}</p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* All FAQ Categories */
              <div className="space-y-6">
                {FAQ_SECTIONS.map((section, sIdx) => {
                  const Icon = section.icon;
                  return (
                    <div key={sIdx} className="space-y-3">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-[#282828]">
                        <div className="w-7 h-7 rounded-lg bg-[#1ed760]/10 flex items-center justify-center text-[#1ed760]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-white">{section.title}</h3>
                      </div>

                      <div className="space-y-2">
                        {section.items.map((item, itemIdx) => {
                          const isOpen = openItems[item.q];
                          return (
                            <div
                              key={itemIdx}
                              className="rounded-xl bg-[#181818] border border-[#282828] overflow-hidden hover:border-[#1ed760]/30 transition"
                            >
                              <button
                                onClick={() => toggleItem(item.q)}
                                className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#202020] transition-colors"
                              >
                                <span className="text-xs sm:text-sm font-semibold text-white">
                                  {item.q}
                                </span>
                                {isOpen ? (
                                  <ChevronDown className="w-4 h-4 text-[#1ed760] shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                                )}
                              </button>

                              {isOpen && (
                                <div className="px-4 pb-4 pt-1 text-xs text-zinc-300 leading-relaxed border-t border-[#242424]">
                                  {item.a}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DEVELOPER REST API & CODE EXAMPLES */}
        {activeTab === "api" && (
          <div className="space-y-8 animate-in fade-in">
            {/* API Quick Overview Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#282828]">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#1ed760]" />
                    Stany Nexus Developer REST API v1
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Base URL: <code className="text-[#1ed760] font-mono font-bold">https://host.stanymaxhub.online</code>
                  </p>
                </div>
                <Link
                  to="/api-keys"
                  className="px-4 py-2 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Get API Key Now
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#121212] border border-[#282828]">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                    Authentication
                  </span>
                  <span className="font-mono text-zinc-200 mt-0.5 block font-semibold">
                    Bearer Token Header
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#121212] border border-[#282828]">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                    Currency Rate
                  </span>
                  <span className="font-mono text-[#1ed760] mt-0.5 block font-bold">
                    1 SQ = 100 TSh
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#121212] border border-[#282828]">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                    Response Format
                  </span>
                  <span className="font-mono text-zinc-200 mt-0.5 block font-semibold">
                    application/json
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Code Snippets Box */}
            <div className="rounded-2xl bg-[#0f1117] border border-[#282828] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 bg-[#181818] border-b border-[#282828]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedSnippet("curl")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                      selectedSnippet === "curl"
                        ? "bg-[#1ed760] text-black"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setSelectedSnippet("node")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                      selectedSnippet === "node"
                        ? "bg-[#1ed760] text-black"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Node.js
                  </button>
                  <button
                    onClick={() => setSelectedSnippet("python")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                      selectedSnippet === "python"
                        ? "bg-[#1ed760] text-black"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Python
                  </button>
                </div>

                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121212] border border-[#282828] text-xs text-zinc-300 hover:text-white transition"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-[#1ed760]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-x-auto">
                <pre className="text-xs sm:text-[13px] font-mono text-emerald-300 leading-relaxed">
                  <code>{codeSnippets[selectedSnippet]}</code>
                </pre>
              </div>
            </div>

            {/* Endpoints Table */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#1ed760]" />
                REST API Endpoints Reference
              </h3>

              <div className="rounded-2xl bg-[#181818] border border-[#282828] overflow-hidden">
                <div className="divide-y divide-[#282828]">
                  {API_ENDPOINTS.map((ep, idx) => (
                    <div
                      key={idx}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#202020] transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              ep.method === "GET"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-[#1ed760]/10 text-[#1ed760] border border-[#1ed760]/20"
                            }`}
                          >
                            {ep.method}
                          </span>
                          <code className="text-xs font-mono font-bold text-white break-all">
                            {ep.path}
                          </code>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{ep.desc}</p>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {ep.cost}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* HTTP Status & Error Codes */}
            <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-3">
              <h4 className="text-sm font-bold text-white">Status & Error Codes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-[#121212] border border-[#282828]">
                  <strong className="text-emerald-400 font-mono block">200 OK</strong>
                  <span className="text-zinc-400 text-[11px]">Request succeeded.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#121212] border border-[#282828]">
                  <strong className="text-amber-400 font-mono block">401 Unauthorized</strong>
                  <span className="text-zinc-400 text-[11px]">API Key is missing or invalid.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#121212] border border-[#282828]">
                  <strong className="text-rose-400 font-mono block">402 Payment Required</strong>
                  <span className="text-zinc-400 text-[11px]">Insufficient SQ balance (top up wallet).</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#121212] border border-[#282828]">
                  <strong className="text-purple-400 font-mono block">429 Rate Limit</strong>
                  <span className="text-zinc-400 text-[11px]">Too many requests in a short interval.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Support Notice */}
        <section className="mt-12 p-6 rounded-2xl bg-[#181818] border border-[#282828] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h4 className="text-sm font-bold text-white">Need More Help?</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Our Stany Host technical team is available 24/7 via the contact page or WhatsApp.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/contact"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#121212] hover:bg-[#202020] text-zinc-200 text-xs font-semibold border border-[#282828] transition"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#1ed760]" />
              <span>Contact Support</span>
            </Link>
            <Link
              to="/api-keys"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black text-xs font-bold transition"
            >
              <span>API Keys Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}