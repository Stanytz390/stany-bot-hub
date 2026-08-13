import { ArrowLeft, Zap, BookOpen, Shield, Repeat2, Gift, Users, HelpCircle, ChevronDown, ChevronRight, Server, Crown, Sparkles, Heart, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useNavLoader } from "@/App";
import { TechBackground } from "@/components/TechBackground";
import { AppLogoIcon } from "@/components/AppLogo";

interface FAQItem { q: string; a: string; }
interface Section { icon: React.ComponentType<{ className?: string }>; title: string; items: FAQItem[]; }

const sections: Section[] = [
  {
    icon: Zap,
    title: "Getting Started",
    items: [
      { q: "How do I deploy a bot?", a: "From your dashboard, go to Services → Bot Deployment. Browse the available bot templates and click 'Deploy' on the one you want. On the deploy page: get your session ID (Step 1), enter a bot name of at least 5 letters (Step 2), paste your session ID (Step 3), choose your device mode (Step 4), then click Deploy. Your bot builds in roughly 2 minutes." },
      { q: "Where do I get a session ID?", a: "Each bot template has a 'Get Session ID' button that opens the pairing page. Follow the pairing process and you'll receive a long session string — copy and paste the entire value into the deploy form." },
      { q: "What's the difference between Android and iOS device?", a: "Android enables interactive buttons (list menus, quick-reply buttons). iOS uses text-only responses. Choose based on your bot's feature set — Android is recommended for most use cases." },
      { q: "How much does hosting cost?", a: "Most bots cost 10 SQ per month. Some premium templates may cost more — the cost is shown clearly on each bot's deploy page before you confirm. 10 SQ = 1 month of hosting for one bot." },
      { q: "Can I deploy multiple bots?", a: "Yes. You can deploy as many bots as your SQ balance allows, and manage them all from the My Bots page." },
    ]
  },
  {
    icon: Repeat2,
    title: "Managing Your Bot",
    items: [
      { q: "How do I restart or stop my bot?", a: "From My Bots, each bot card has Start, Stop, and Restart buttons. Use these to control your bot's lifecycle." },
      { q: "How do I update my session ID?", a: "Click 'Edit' on your bot card, enter the new session string, and save. This is useful if WhatsApp logs you out." },
      { q: "How do I view logs?", a: "Click the 'Logs' button on any bot card. This shows recent application output to help you debug issues." },
      { q: "My bot stopped working after a WhatsApp update — what do I do?", a: "Generate a new session using the pairing link for your bot, then update your bot via the Edit button. This usually resolves connection issues." },
      { q: "How do I share my bot's deploy page with someone?", a: "On the Bot Deployment page, each bot template has a 'Copy link' button. Share that link and it opens the deploy page for that specific bot directly." },
    ]
  },
  {
    icon: Zap,
    title: "SQ Coins & Billing",
    items: [
      { q: "What are SQ Coins?", a: "SQ is the in-app currency used to pay for bot hosting and panels. 10 SQ = 1 month of hosting for one bot. SQ never expires." },
      { q: "How do I buy SQ?", a: "Go to the Top Up page. Choose a package and pay via M-Pesa, Airtel Money, or Credit/Debit Card. SQ is added instantly after confirmation." },
      { q: "What is the cheapest option?", a: "The Starter pack gives you the minimum SQ needed to deploy a bot. The Best Deal pack gives the most SQ per shilling." },
      { q: "Do SQ coins expire?", a: "No — your SQ balance never expires. Use it whenever you need to deploy or renew." },
    ]
  },
  {
    icon: Gift,
    title: "Coupons",
    items: [
      { q: "Where do I enter a coupon code?", a: "From the dashboard, click 'Coupon Code'. Enter the code you received and click Claim." },
      { q: "Where can I find coupon codes?", a: "Coupon codes are shared in the STANY WhatsApp groups and occasionally on social media. Keep an eye out!" },
      { q: "Can I use the same coupon twice?", a: "No. Each coupon can only be claimed once, by one account." },
    ]
  },
  {
    icon: Users,
    title: "Referrals",
    items: [
      { q: "How do referrals work?", a: "Share your unique referral link from the dashboard. When someone signs up using your link, you both earn 2 SQ automatically." },
      { q: "Are there restrictions on referrals?", a: "Yes — accounts created from the same IP address or device as yours do not qualify for referral rewards. This prevents self-referrals." },
      { q: "When do I receive my referral SQ?", a: "Instantly, as soon as your referral creates an account. No delays, no waiting." },
    ]
  },
  {
    icon: Server,
    title: "Panel Hosting",
    items: [
      { q: "What is a hosting panel?", a: "A hosting panel (Pterodactyl) gives you a full server environment with console access, file manager, and real-time resource monitoring. You can run any Node.js app or WhatsApp bot on it directly." },
      { q: "How do I buy a panel?", a: "Go to Services → Panels → Purchase Panels. Choose a plan and click Purchase. SQ is deducted instantly and your panel credentials (username & password) are shown immediately. Save them — they are only shown once." },
      { q: "How do I access my panels?", a: "Go to Services → Panels → My Panels (or visit the My Panels page from the sidebar). Each panel entry has an 'Open Panel' button that takes you directly to the login page." },
      { q: "Are there any recurring fees for panels?", a: "No. Panel purchases are one-time — you pay SQ once and you keep access. There are no monthly renewals for panels." },
      { q: "Can I delete my panel record?", a: "Yes — in My Panels, each panel has a 'Remove' button. This removes the saved credentials from your account. Your actual server access on the panel remains unchanged." },
    ]
  },
  {
    icon: Crown,
    title: "Admin Panel Access",
    items: [
      { q: "What is the Admin Panel package?", a: "The Admin Panel package (40 SQ) gives your account full administrator privileges on the Pterodactyl game panel. As an admin you can manage all servers, users, nodes, and allocations directly from the panel dashboard." },
      { q: "How do I purchase admin access?", a: "Go to Services → Panels → Purchase Panels and scroll to the Admin Panel card. Click Purchase (costs 40 SQ). Your admin credentials are shown immediately after — save them securely." },
      { q: "Can I use admin access alongside a regular panel plan?", a: "Yes. Admin access is independent. You can also hold regular panel server plans at the same time." },
    ]
  },
  {
    icon: Shield,
    title: "Account & Security",
    items: [
      { q: "I forgot my password — how do I reset it?", a: "Contact support via the contact page or reach out to @stanytz on WhatsApp/Telegram. An admin will reset your password." },
      { q: "My account was banned — what should I do?", a: "Contact support with your account details. Bans are issued for ToS violations. If you believe it's an error, we'll review it." },
      { q: "Is my session ID safe?", a: "Your session ID is stored encrypted and used only to connect your bot to WhatsApp. We do not share or expose it." },
    ]
  },
  {
    icon: HelpCircle,
    title: "Troubleshooting",
    items: [
      { q: "My bot shows 'stopped' but I haven't stopped it", a: "WhatsApp may have disconnected the session. Go to Edit on your bot card, generate a new session using the bot's pairing link, paste it in, and click Save. Then restart the bot." },
      { q: "The deploy page is blank when I open a bot link", a: "Try refreshing the page. If you're not logged in, you'll be redirected to login first — then navigate back to the bot link. Make sure the bot template link is correct." },
      { q: "Logs show an error I don't understand", a: "Copy the error and contact support. Include your bot name and what the error says." },
      { q: "The page goes blank when I press Back on my phone", a: "Try tapping the on-screen back arrow instead of the phone's hardware back button. If a page still goes blank, refresh — you'll be taken to the correct page." },
    ]
  },
];

function FAQCard({ q, a }: FAQItem) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-pink-500/10 rounded-xl overflow-hidden bg-[#0a0a0f]/30 hover:border-pink-500/20 transition-all duration-300">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-pink-500/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-medium text-white pr-4">{q}</span>
        {open ? 
          <ChevronDown className="w-4 h-4 text-pink-400 shrink-0" /> : 
          <ChevronRight className="w-4 h-4 text-pink-400/50 shrink-0 group-hover:text-pink-400 transition-colors" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-sm text-pink-400/70 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ===== ANIMATED LOGO PINK =====
function AnimatedLogo() {
  return (
    <div className="relative group cursor-pointer">
      <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-500" />
      <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center ring-2 ring-pink-400/50 shadow-lg shadow-pink-500/20">
        <AppLogoIcon className="w-4 h-4 text-white drop-shadow-sm" />
      </div>
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400 rounded-full animate-pulse ring-2 ring-[#0a0a0f]" />
    </div>
  );
}

export function Docs() {
  const { navigateWithLoader } = useNavLoader();
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? sections.flatMap(section =>
        section.items
          .filter(item => item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase()))
          .map(item => ({ ...item, sectionTitle: section.title, SectionIcon: section.icon }))
      )
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden">
      <TechBackground />
      
      {/* ===== ANIMATED PARTICLES ===== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-pink-500/5"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float-particle ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: Math.random() * 10 + 's',
            }}
          />
        ))}
        <style>{`
          @keyframes float-particle {
            0% { transform: translateY(0px) scale(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) scale(1); opacity: 0; }
          }
        `}</style>
      </div>

      {/* ===== NAVBAR ===== */}
      <nav className="border-b border-pink-500/10 sticky top-0 bg-[#0a0a0f]/80 z-50 shadow-lg shadow-pink-500/5">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center h-16 gap-3">
            <button 
              onClick={() => navigateWithLoader("/dashboard")} 
              className="p-2.5 -ml-2 rounded-xl hover:bg-pink-500/10 transition-colors text-pink-400 hover:text-pink-300"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <AnimatedLogo />
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-pink-400" />
              <h1 className="font-bold text-lg text-white">STANY Docs</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-pink-500/20 text-pink-400 rounded-full border border-pink-500/20">
                v2.0
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 relative z-[1]">
        {/* ===== HERO CARD ===== */}
        <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 to-pink-600/5 border border-pink-500/20 p-6 shadow-lg shadow-pink-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-pink-400" />
            <h2 className="font-bold text-xl text-white">STANY Host Documentation</h2>
          </div>
          <p className="text-sm text-pink-400/70 leading-relaxed">
            Everything you need to deploy, manage, and troubleshoot your WhatsApp bots and game server panels. Can't find an answer?
          </p>
          <button
            onClick={() => navigateWithLoader("/contact")}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-400 hover:to-pink-500 text-xs font-semibold transition-all duration-300 shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50"
          >
            <HelpCircle className="w-4 h-4" />
            Contact Support
          </button>
        </div>

        {/* ===== SEARCH ===== */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documentation..."
            className="w-full px-4 py-3 pl-11 rounded-xl border border-pink-500/10 bg-[#0a0a0f]/50 text-sm text-white placeholder:text-pink-400/40 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
          {search && (
            <button 
              onClick={() => setSearch("")} 
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-pink-400/50 hover:text-pink-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ===== SEARCH RESULTS ===== */}
        {filtered !== null ? (
          filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8 text-pink-400/50" />
              </div>
              <p className="text-sm text-pink-400/50">
                No results found for "<span className="text-pink-400 font-medium">{search}</span>"
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item, i) => (
                <div key={i} className="border border-pink-500/10 rounded-xl overflow-hidden bg-[#0a0a0f]/30 hover:border-pink-500/20 transition-all duration-300">
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <item.SectionIcon className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-xs text-pink-400/50 uppercase tracking-wide font-medium">{item.sectionTitle}</span>
                  </div>
                  <div className="px-4 pb-4">
                    <p className="text-sm font-medium text-white mb-1.5">{item.q}</p>
                    <p className="text-sm text-pink-400/70 leading-relaxed">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // ===== FAQ SECTIONS =====
          <>
            {sections.map((section, idx) => (
              <div key={section.title} className="space-y-3 animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-1.5 rounded-lg bg-pink-500/10">
                    <section.icon className="w-4 h-4 text-pink-400" />
                  </div>
                  <h3 className="font-semibold text-sm text-pink-400 uppercase tracking-wider">{section.title}</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-pink-500/20 to-transparent" />
                </div>
                <div className="space-y-2">
                  {section.items.map(item => (
                    <FAQCard key={item.q} {...item} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ===== FOOTER CTA ===== */}
        <div className="rounded-2xl bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 p-6 text-center">
          <p className="text-sm font-semibold text-white mb-1">Still need help?</p>
          <p className="text-xs text-pink-400/60 mb-4">Our support team is available via the contact page.</p>
          <button
            onClick={() => navigateWithLoader("/contact")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-400 hover:to-pink-500 text-sm font-semibold transition-all duration-300 shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50"
          >
            <MessageCircle className="w-4 h-4" />
            Get Support
          </button>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="pt-4 text-center">
          <p className="text-xs text-pink-400/30">
            Made with <Heart className="w-3 h-3 inline text-pink-400 animate-heartbeat" /> by STANY
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.2); }
          28% { transform: scale(1); }
          42% { transform: scale(1.1); }
          70% { transform: scale(1); }
        }
        .animate-heartbeat {
          animation: heartbeat 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}