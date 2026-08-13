import { useLocation } from "react-router";
import { Seo } from "@/components/Seo";

interface Meta { title: string; description: string }

const ROUTE_META: Record<string, Meta> = {
  "/": {
    title: "Stany Hosting — WhatsApp Bot & Panel Hosting",
    description: "Deploy WhatsApp bots and premium panels in seconds. Pay with SQ Coins via M-Pesa, Airtel, Tigo, Halotel, PayPal, Bitcoin or MiniPay."
  },
  "/login": { title: "Login", description: "Sign in to your Stany Hosting account to manage bots, panels and SQ Coins." },
  "/signup": { title: "Create account", description: "Create a Stany Hosting account and get your WhatsApp bot online in minutes." },
  "/verify-email": { title: "Verify email", description: "Enter the 6-digit code we sent to your email to activate your account." },
  "/dashboard": { title: "Dashboard", description: "Your Stany Hosting control center: balance, bots, panels and quick actions." },
  "/topup": { title: "Top up SQ Coins", description: "Buy SQ Coins with M-Pesa, Airtel, Tigo, Halotel, PayPal, Bitcoin or MiniPay — promo codes supported." },
  "/profile": { title: "Profile", description: "Manage your Stany Hosting profile, security and language settings." },
  "/docs": { title: "Documentation", description: "Guides for deploying, configuring and maintaining your WhatsApp bot on Stany Hosting." },
  "/deploy": { title: "Deploy a bot", description: "Deploy a new WhatsApp bot instance on Stany Hosting infrastructure." },
  "/services/bots": { title: "Bot hosting", description: "Browse ready-made WhatsApp bot templates and deploy them instantly." },
  "/services/panels": { title: "Panel hosting", description: "Premium Pterodactyl panel hosting plans with RAM, CPU and disk to match your needs." },
  "/services/panels/purchasepanel": { title: "Buy a panel plan", description: "Compare panel plans and buy with SQ Coins — share any plan link with friends." },
  "/services/panels/mypanels": { title: "My panels", description: "Access your purchased panels, credentials and login links." },
  "/mybots": { title: "My bots", description: "Manage, restart and monitor all your deployed WhatsApp bots." },
  "/mypanels": { title: "My panels", description: "Access your purchased panels, credentials and login links." },
  "/tutorials": { title: "Tutorials", description: "Step-by-step video and text tutorials for Stany Hosting bots and panels." },
  "/community": { title: "Community chat", description: "Chat live with the Stany Hosting community — ask, reply and share tips." },
  "/contact": { title: "Contact support", description: "Reach the Stany Hosting team for help with hosting, payments or panels." },
  "/send-coins": { title: "Send SQ Coins", description: "Send SQ Coins to any username or create a shareable gift link." },
  "/integrations": { title: "Agent integrations (MCP)", description: "Connect AI agents to your Stany Hosting account with a secure MCP token." },
  "/api-keys": { title: "Developer API keys", description: "Create STANY API keys, read the docs and track SQ spent on every metered API call." },
  "/history": { title: "History", description: "Track deploys, rewards and payments with filters, search and receipts on Stany Hosting." },
  "/deploy/repo": { title: "Deploy your own repo", description: "Deploy any GitHub WhatsApp bot repository on Stany Hosting with SQ Coins." },
  "/receipt": { title: "Payment receipt", description: "View, download and share your Stany Hosting payment receipt." },
  "/claim-coins": { title: "Claim SQ Coins", description: "Claim free SQ Coins from a Stany Hosting gift link." },
  "/staff": { title: "Staff panel", description: "Staff tools for SQ grants, coupons, moderation and audit logs." },
  "/admin": { title: "Admin panel", description: "Administration for users, payments, ads, promo codes and backups." },
};

function matchMeta(pathname: string): Meta {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  if (pathname.startsWith("/services/bots/")) {
    return { title: "Deploy bot", description: "Deploy this WhatsApp bot template on Stany Hosting in a few clicks." };
  }
  if (pathname.startsWith("/claim/")) {
    return { title: "Claim SQ Coins", description: "Someone sent you free SQ Coins on Stany Hosting — claim them now." };
  }
  return { title: "Stany Hosting", description: "WhatsApp bot and panel hosting powered by SQ Coins." };
}

export function RouteSeo() {
  const { pathname } = useLocation();
  const meta = matchMeta(pathname);
  return <Seo title={meta.title} description={meta.description} path={pathname} />;
}
