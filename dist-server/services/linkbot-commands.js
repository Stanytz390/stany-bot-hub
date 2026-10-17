export const LINK_BOT_COMMANDS = [
    // ---------- GENERAL ----------
    { name: "menu", category: "General", description: "Show the full command menu with your name and logo" },
    { name: "help", category: "General", description: "Help for a single command", usage: "help <command>" },
    { name: "ping", category: "General", description: "Check bot speed and uptime" },
    { name: "alive", category: "General", description: "Confirm the bot is online" },
    { name: "owner", category: "General", description: "Show the owner contact card" },
    { name: "profile", category: "General", description: "Your STANY profile and SQ balance" },
    { name: "runtime", category: "General", description: "How long the bot has been running" },
    { name: "speed", category: "General", description: "Network latency test" },
    { name: "report", category: "General", description: "Send a bug report to the owner", usage: "report <message>" },
    { name: "support", category: "General", description: "Open the STANY support link" },
    // ---------- HOSTING ----------
    { name: "bots", category: "Hosting", description: "List every bot you can deploy from STANY" },
    { name: "deploy", category: "Hosting", description: "Deploy a bot from the list", usage: "deploy <bot> <session>" },
    { name: "mybots", category: "Hosting", description: "Your deployed bots and their status" },
    { name: "restart", category: "Hosting", description: "Restart one of your bots", usage: "restart <app>" },
    { name: "stopbot", category: "Hosting", description: "Stop one of your bots", usage: "stopbot <app>" },
    { name: "startbot", category: "Hosting", description: "Start a stopped bot", usage: "startbot <app>" },
    { name: "logs", category: "Hosting", description: "Last 100 log lines of a bot", usage: "logs <app>" },
    { name: "setvar", category: "Hosting", description: "Change a bot variable", usage: "setvar <app> KEY=VALUE" },
    { name: "getvars", category: "Hosting", description: "Show a bot's variables", usage: "getvars <app>" },
    { name: "renew", category: "Hosting", description: "Renew a bot with SQ", usage: "renew <app>" },
    { name: "panels", category: "Hosting", description: "Panel server plans priced in SQ" },
    { name: "buypanel", category: "Hosting", description: "Buy a panel server", usage: "buypanel <plan>" },
    { name: "website", category: "Hosting", description: "Host a website and attach a custom domain" },
    // ---------- SOCIAL BOOSTING ----------
    { name: "smm", category: "Boosting", description: "Browse social boosting services", usage: "smm <platform>" },
    { name: "boost", category: "Boosting", description: "Place a boosting order", usage: "boost <id> <link> <qty>" },
    { name: "orderstatus", category: "Boosting", description: "Check a boosting order", usage: "orderstatus <id>" },
    { name: "myorders", category: "Boosting", description: "Your latest boosting orders" },
    { name: "prices", category: "Boosting", description: "Live SQ prices for popular services" },
    // ---------- WALLET ----------
    { name: "balance", category: "Wallet", description: "Your SQ wallet balance" },
    { name: "topup", category: "Wallet", description: "Get a top-up link (1 SQ = 100 TZS)" },
    { name: "send", category: "Wallet", description: "Send SQ to another user", usage: "send <user> <amount>" },
    { name: "transactions", category: "Wallet", description: "Your last 10 transactions" },
    { name: "referral", category: "Wallet", description: "Your referral link and earnings" },
    // ---------- GROUP ----------
    { name: "add", category: "Group", description: "Add a member", usage: "add <number>", adminOnly: true },
    { name: "kick", category: "Group", description: "Remove a member", usage: "kick @user", adminOnly: true },
    { name: "promote", category: "Group", description: "Make a member admin", adminOnly: true },
    { name: "demote", category: "Group", description: "Remove admin rights", adminOnly: true },
    { name: "tagall", category: "Group", description: "Mention everyone", adminOnly: true },
    { name: "hidetag", category: "Group", description: "Silent mention of everyone", adminOnly: true },
    { name: "group", category: "Group", description: "Open or close the group", usage: "group open|close", adminOnly: true },
    { name: "setname", category: "Group", description: "Change the group name", adminOnly: true },
    { name: "setdesc", category: "Group", description: "Change the group description", adminOnly: true },
    { name: "grouplink", category: "Group", description: "Get the group invite link", adminOnly: true },
    { name: "welcome", category: "Group", description: "Toggle welcome messages", adminOnly: true },
    { name: "warn", category: "Group", description: "Warn a member", usage: "warn @user", adminOnly: true },
    { name: "resetwarn", category: "Group", description: "Clear warnings for a member", adminOnly: true },
    // ---------- PROTECTION ----------
    { name: "antilink", category: "Protection", description: "Delete or kick on group links", usage: "antilink on|off", adminOnly: true },
    { name: "antistatusmention", category: "Protection", description: "Block status mention spam", usage: "antistatusmention on|off", adminOnly: true },
    { name: "antimention", category: "Protection", description: "Block mass mentions of you", usage: "antimention on|off", adminOnly: true },
    { name: "antibot", category: "Protection", description: "Remove other bots from the group", adminOnly: true },
    { name: "antidelete", category: "Protection", description: "Recover deleted messages", adminOnly: true },
    { name: "antispam", category: "Protection", description: "Rate limit flooding members", adminOnly: true },
    { name: "antiforeign", category: "Protection", description: "Block foreign country codes", adminOnly: true },
    { name: "mute", category: "Protection", description: "Mute a member", usage: "mute @user", adminOnly: true },
    { name: "unmute", category: "Protection", description: "Unmute a member", adminOnly: true },
    // ---------- MEDIA & TOOLS ----------
    { name: "sticker", category: "Media", description: "Turn an image or video into a sticker" },
    { name: "toimg", category: "Media", description: "Turn a sticker back into an image" },
    { name: "tomp3", category: "Media", description: "Extract audio from a video" },
    { name: "song", category: "Media", description: "Download a song", usage: "song <title>" },
    { name: "video", category: "Media", description: "Download a video", usage: "video <title>" },
    { name: "tiktok", category: "Media", description: "Download a TikTok without watermark" },
    { name: "insta", category: "Media", description: "Download an Instagram reel or photo" },
    { name: "fb", category: "Media", description: "Download a Facebook video" },
    { name: "img", category: "Media", description: "Search images", usage: "img <query>" },
    { name: "ai", category: "Media", description: "Ask the AI assistant", usage: "ai <question>" },
    { name: "translate", category: "Media", description: "Translate text", usage: "translate en <text>" },
    { name: "tts", category: "Media", description: "Text to voice note", usage: "tts <text>" },
    { name: "qr", category: "Media", description: "Generate a QR code", usage: "qr <text>" },
    { name: "weather", category: "Media", description: "Weather for a city", usage: "weather <city>" },
    { name: "calc", category: "Media", description: "Calculator", usage: "calc 2+2*10" },
    // ---------- FUN ----------
    { name: "joke", category: "Fun", description: "Random joke" },
    { name: "quote", category: "Fun", description: "Motivational quote" },
    { name: "truth", category: "Fun", description: "Truth question" },
    { name: "dare", category: "Fun", description: "Dare challenge" },
    { name: "ship", category: "Fun", description: "Ship two members" },
    { name: "fact", category: "Fun", description: "Random fact" },
    // ---------- OWNER ----------
    { name: "setname-bot", category: "Owner", description: "Change your bot display name", adminOnly: true },
    { name: "setlogo", category: "Owner", description: "Change your bot logo by URL", usage: "setlogo <url>", adminOnly: true },
    { name: "setprefix", category: "Owner", description: "Change the command prefix", adminOnly: true },
    { name: "setchannel", category: "Owner", description: "Set the channel to auto-follow and react", adminOnly: true },
    { name: "broadcast", category: "Owner", description: "Broadcast to all your chats", adminOnly: true },
    { name: "block", category: "Owner", description: "Block a contact", adminOnly: true },
    { name: "unblock", category: "Owner", description: "Unblock a contact", adminOnly: true },
    { name: "shutdown", category: "Owner", description: "Pause the bot until you resume it", adminOnly: true }
];
export const COMMAND_CATEGORIES = Array.from(new Set(LINK_BOT_COMMANDS.map((c) => c.category)));
/** Render the WhatsApp menu text the runtime sends when a user types `menu`. */
export function renderMenu(opts) {
    const lines = [];
    lines.push(`╭─「 *${opts.displayName || opts.username}* 」`);
    lines.push(`│ user: @${opts.username}`);
    lines.push(`│ prefix: ${opts.prefix}`);
    lines.push(`│ commands: ${LINK_BOT_COMMANDS.length}`);
    lines.push("╰────────────");
    for (const cat of COMMAND_CATEGORIES) {
        lines.push(`\n*${cat.toUpperCase()}*`);
        for (const c of LINK_BOT_COMMANDS.filter((x) => x.category === cat)) {
            lines.push(`• ${opts.prefix}${c.name} — ${c.description}`);
        }
    }
    if (opts.bots.length) {
        lines.push("\n*AVAILABLE BOTS TO DEPLOY*");
        for (const b of opts.bots) {
            lines.push(`• ${b.name}${b.priceSq ? ` — ${b.priceSq} SQ` : ""} (${opts.prefix}deploy ${b.slug})`);
        }
    }
    lines.push(`\n${opts.footer}`);
    return lines.join("\n");
}
