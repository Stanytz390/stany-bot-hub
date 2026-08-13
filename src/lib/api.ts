// ============================================================
// API CLIENT - STANY HOST
// Bila Verification - Signup moja kwa moja
// ============================================================

const API_URL = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {})
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_URL}${path}`, { ...options, headers });
}

// ============================================================
// AUTH - BILA VERIFICATION
// ============================================================

export async function signup(email: string, username: string, password: string, referralCode?: string, fingerprint?: string) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password, referralCode, fingerprint })
  });
  return res.json();
}

export async function login(usernameOrEmail: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernameOrEmail, password })
  });
  return res.json();
}

export async function logout() {
  await fetchWithAuth("/auth/logout", { method: "POST" });
  localStorage.removeItem("token");
}

export async function getMe() {
  const res = await fetchWithAuth("/auth/me");
  return res.json();
}

export async function updateUsername(username: string) {
  const res = await fetchWithAuth("/auth/username", {
    method: "PATCH",
    body: JSON.stringify({ username })
  });
  return res.json();
}

export async function githubStatus() {
  const res = await fetch(`${API_URL}/auth/github/status`);
  return res.json();
}

// ============================================================
// ALIASES ZA COMPATIBILITY (VerifyEmail.tsx inatumia hizi)
// ============================================================

// Fix: Ongeza _ ili kuepuka warning ya unused variables
export async function verifyEmail(_email: string, _code: string) {
  // Verification imeondolewa - rudisha token moja kwa moja
  return { 
    token: localStorage.getItem("token"),
    user: JSON.parse(localStorage.getItem("user") || "{}"),
    message: "Verification not required"
  };
}

export async function resendCode(_email: string) {
  // Verification imeondolewa - hakuna code ya ku-resend
  return { 
    success: true,
    message: "Verification not required"
  };
}

// ============================================================
// BOTS
// ============================================================
export async function getBots() {
  const res = await fetchWithAuth("/bots");
  return res.json();
}

export async function deployBot(data: { phoneNumber?: string; botName?: string; sessionVar: string; isTrial?: boolean; device?: string; months?: number }) {
  const res = await fetchWithAuth("/bots/deploy", {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function stopBot(id: string) {
  const res = await fetchWithAuth(`/bots/${id}/stop`, { method: "POST" });
  return res.json();
}

export async function startBot(id: string) {
  const res = await fetchWithAuth(`/bots/${id}/start`, { method: "POST" });
  return res.json();
}

export async function restartBot(id: string) {
  const res = await fetchWithAuth(`/bots/${id}/restart`, { method: "POST" });
  return res.json();
}

export async function renewBot(id: string, months: number) {
  const res = await fetchWithAuth(`/bots/${id}/renew`, {
    method: "POST",
    body: JSON.stringify({ months })
  });
  return res.json();
}

export async function deleteBot(id: string) {
  const res = await fetchWithAuth(`/bots/${id}/delete`, { method: "POST" });
  return res.json();
}

export async function getBotLogs(id: string) {
  const res = await fetchWithAuth(`/bots/${id}/logs`);
  return res.json();
}

export async function updateBotVars(id: string, session: string, device?: string, extraVars?: Record<string, string>) {
  const body: Record<string, unknown> = { session };
  if (device) body.device = device;
  if (extraVars && Object.keys(extraVars).length > 0) body.extraVars = extraVars;
  const res = await fetchWithAuth(`/bots/${id}/vars`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
  return res.json();
}

export async function checkTrial(phone: string) {
  const res = await fetchWithAuth(`/bots/trial-check/${phone}`);
  return res.json();
}


// ============================================================
// BOT TEMPLATES
// ============================================================
export async function getBotTemplates() {
  const res = await fetchWithAuth("/bot-templates");
  return res.json();
}

export async function getBotTemplateBySlug(slug: string) {
  const res = await fetch(`${API_URL}/bot-templates/slug/${slug}`);
  return res.json();
}

export async function addBotTemplate(data: { name: string; githubRepo: string; sessionIdUrl: string; costTx: number }) {
  const res = await fetchWithAuth("/bot-templates", {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteBotTemplate(id: string) {
  const res = await fetchWithAuth(`/bot-templates/${id}`, { method: "DELETE" });
  return res.json();
}

export async function refreshBotTemplateImage(id: string) {
  const res = await fetchWithAuth(`/bot-templates/${id}/refresh-image`, { method: "POST" });
  return res.json();
}

export interface LiveBotVar { key: string; value: string; description: string; required: boolean }

/** Real, live config vars of a deployed bot (templates and custom repos). */
export async function getBotVars(id: string): Promise<{ appName: string; sessionIdUrl: string; session: string; vars: LiveBotVar[] }> {
  const res = await fetchWithAuth(`/bots/${id}/vars`);
  if (!res.ok) throw new Error("Could not read bot configuration");
  return res.json();
}

export async function getTemplateAppVars(templateId: string): Promise<{ vars: { key: string; description: string; required: boolean; value: string }[]; sessionIdUrl: string }> {
  const res = await fetchWithAuth(`/bots/template-appvars/${templateId}`);
  return res.json();
}

export async function deployBotWithTemplate(data: {
  botTemplateId: string;
  botName: string;
  sessionVar: string;
  device?: string;
  months?: number;
  promoCode?: string;
  extraVars?: Record<string, string>;
}) {
  const res = await fetchWithAuth("/bots/deploy-template", {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

// ============================================================
// PAYMENTS - PETERPAY
// ============================================================
export async function getPackages() {
  const res = await fetch(`${API_URL}/payments/packages`);
  return res.json();
}

export async function getTransactions() {
  const res = await fetchWithAuth("/payments/history");
  return res.json();
}

export async function getPaymentHistory() {
  const res = await fetchWithAuth("/payments/history");
  return res.json();
}

export async function chargeWithPackage(packageId: string, phone: string, provider: string) {
  const res = await fetchWithAuth("/payments/charge", {
    method: "POST",
    body: JSON.stringify({ packageId, phone, provider })
  });
  return res.json();
}

export async function chargeCustom(txAmount: number, phone: string, provider: string) {
  const res = await fetchWithAuth("/payments/charge-custom", {
    method: "POST",
    body: JSON.stringify({ txAmount, phone, provider })
  });
  return res.json();
}

export async function getMobileChargeStatus(reference: string) {
  const res = await fetchWithAuth(`/payments/charge/status/${reference}`);
  return res.json();
}

export async function verifyPayment(reference: string) {
  const res = await fetchWithAuth(`/payments/verify/${reference}`);
  return res.json();
}

export async function manualConfirmPayment(reference: string) {
  const res = await fetchWithAuth(`/payments/manual-confirm/${reference}`, {
    method: "POST"
  });
  return res.json();
}

export async function getPeterPayBalance() {
  const res = await fetchWithAuth("/payments/balance");
  return res.json();
}

export async function directPayout(amount: number, recipient_phone: string, network: string, reason?: string) {
  const res = await fetchWithAuth("/payments/payout", {
    method: "POST",
    body: JSON.stringify({ amount, recipient_phone, network, reason })
  });
  return res.json();
}

// ============================================================
// COINS - SQ Coins
// ============================================================
export async function transferCoins(username: string, amount: number) {
  const res = await fetchWithAuth("/coins/transfer", { 
    method: "POST", 
    body: JSON.stringify({ username, amount }) 
  });
  return res.json();
}

export async function createCoinLink(amountPerUser: number, people: number, message?: string) {
  const res = await fetchWithAuth("/coins/links", { 
    method: "POST", 
    body: JSON.stringify({ amountPerUser, people, message }) 
  });
  return res.json();
}

export async function myCoinLinks() {
  const res = await fetchWithAuth("/coins/links");
  return res.json();
}

export async function cancelCoinLink(code: string) {
  const res = await fetchWithAuth(`/coins/links/${code}/cancel`, { method: "POST" });
  return res.json();
}

export async function previewCoinLink(code: string) {
  const res = await fetch(`${API_URL}/coins/links/${code}/preview`);
  return res.json();
}

export async function claimCoinLink(code: string) {
  const res = await fetchWithAuth(`/coins/links/${code}/claim`, { method: "POST" });
  return res.json();
}

export async function coinLimits() {
  const res = await fetchWithAuth("/coins/limits");
  return res.json();
}

// ============================================================
// PANELS
// ============================================================
export async function getPanelPlans() {
  const res = await fetch(`${API_URL}/panels/plans`);
  return res.json();
}

export async function getMyPanels() {
  const res = await fetchWithAuth("/panels/my");
  return res.json();
}

export async function purchasePanel(planId: string) {
  const res = await fetchWithAuth("/panels/purchase", {
    method: "POST",
    body: JSON.stringify({ planId })
  });
  return res.json();
}

export async function purchaseAdminPanel() {
  const res = await fetchWithAuth("/panels/purchase-admin", { method: "POST" });
  return res.json();
}

export async function deletePanel(id: string) {
  const res = await fetchWithAuth(`/panels/my/${id}`, { method: "DELETE" });
  return res.json();
}

// ============================================================
// ADMIN
// ============================================================
export async function getAdminStats() {
  const res = await fetchWithAuth("/admin/stats");
  return res.json();
}

export async function getAdminUsers() {
  const res = await fetchWithAuth("/admin/users");
  return res.json();
}

export async function banUser(id: string, reason?: string) {
  const res = await fetchWithAuth(`/admin/users/${id}/ban`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
  return res.json();
}

export async function unbanUser(id: string) {
  const res = await fetchWithAuth(`/admin/users/${id}/unban`, { method: "POST" });
  return res.json();
}

export async function grantSq(id: string, amount: number) {
  const res = await fetchWithAuth(`/admin/users/${id}/sq`, {
    method: "POST",
    body: JSON.stringify({ amount })
  });
  return res.json();
}

export async function subtractSq(id: string, amount: number) {
  const res = await fetchWithAuth(`/admin/users/${id}/subtract-sq`, {
    method: "POST",
    body: JSON.stringify({ amount })
  });
  return res.json();
}

// ALIASES for Admin.tsx compatibility
export async function grantTx(id: string, amount: number) {
  return grantSq(id, amount);
}

export async function subtractTx(id: string, amount: number) {
  return subtractSq(id, amount);
}

export async function resetPassword(id: string, password: string) {
  const res = await fetchWithAuth(`/admin/users/${id}/password`, {
    method: "POST",
    body: JSON.stringify({ password })
  });
  return res.json();
}

export async function deleteUser(id: string) {
  const res = await fetchWithAuth(`/admin/users/${id}`, { method: "DELETE" });
  return res.json();
}

export async function getAdminBots() {
  const res = await fetchWithAuth("/admin/bots");
  return res.json();
}

export async function stopAdminBot(id: string) {
  const res = await fetchWithAuth(`/admin/bots/${id}/stop`, { method: "POST" });
  return res.json();
}

export async function startAdminBot(id: string) {
  const res = await fetchWithAuth(`/admin/bots/${id}/start`, { method: "POST" });
  return res.json();
}

export async function restartAdminBot(id: string) {
  const res = await fetchWithAuth(`/admin/bots/${id}/restart`, { method: "POST" });
  return res.json();
}

export async function deleteAdminBot(id: string) {
  const res = await fetchWithAuth(`/admin/bots/${id}`, { method: "DELETE" });
  return res.json();
}

export async function getAdminBotLogs(id: string) {
  const res = await fetchWithAuth(`/admin/bots/${id}/logs`);
  return res.json();
}

export async function getAdminTransactions() {
  const res = await fetchWithAuth("/admin/transactions");
  return res.json();
}

export async function deleteAdminTransaction(id: string) {
  const res = await fetchWithAuth(`/admin/transactions/${id}`, { method: "DELETE" });
  return res.json();
}

export async function deleteAdminTransactionsBulk(ids: string[]) {
  const res = await fetchWithAuth("/admin/transactions/bulk", {
    method: "DELETE",
    body: JSON.stringify({ ids })
  });
  return res.json();
}

export async function resolveStaleTransactions() {
  const res = await fetchWithAuth("/admin/transactions/resolve-stale", { method: "POST" });
  return res.json();
}

export async function getAdminCoupons() {
  const res = await fetchWithAuth("/admin/coupons");
  return res.json();
}

export async function createCoupon(code: string, txAmount: number) {
  const res = await fetchWithAuth("/admin/coupons", {
    method: "POST",
    body: JSON.stringify({ code, txAmount })
  });
  return res.json();
}

export async function deleteCoupon(id: string) {
  const res = await fetchWithAuth(`/admin/coupons/${id}`, { method: "DELETE" });
  return res.json();
}

export async function getAdminReferrals() {
  const res = await fetchWithAuth("/admin/referrals");
  return res.json();
}

export async function deleteAllAdminReferrals() {
  const res = await fetchWithAuth("/admin/referrals/all", { method: "DELETE" });
  return res.json();
}

export async function getAdminTeams() {
  const res = await fetchWithAuth("/admin/teams");
  return res.json();
}

export async function createAdminTeam(name: string, billingLabel: string) {
  const res = await fetchWithAuth("/admin/teams", {
    method: "POST",
    body: JSON.stringify({ name, billingLabel })
  });
  return res.json();
}

export async function updateAdminTeam(id: string, billingLabel: string, active?: boolean) {
  const body: Record<string, unknown> = { billingLabel };
  if (typeof active === "boolean") body.active = active;
  const res = await fetchWithAuth(`/admin/teams/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
  return res.json();
}

export async function deleteAdminTeam(id: string) {
  const res = await fetchWithAuth(`/admin/teams/${id}`, { method: "DELETE" });
  return res.json();
}

export async function getAdminDbStats() {
  const res = await fetchWithAuth("/admin/db/stats");
  return res.json();
}

export async function purgeAdminCollection(collection: string) {
  const res = await fetchWithAuth(`/admin/db/purge/${collection}`, { method: "DELETE" });
  return res.json();
}

export async function getAdminPanels() {
  const res = await fetchWithAuth("/panels/admin/all");
  return res.json();
}

export async function deleteAdminPanel(id: string) {
  const res = await fetchWithAuth(`/panels/admin/panel/${id}`, { method: "DELETE" });
  return res.json();
}

export async function getAdminPanelPlans() {
  const res = await fetchWithAuth("/panels/plans");
  return res.json();
}

export async function createAdminPanelPlan(data: {
  name: string;
  description: string;
  txCost: number;
  ram: string;
  disk: string;
  cpu: string;
  isBestDeal: boolean;
}) {
  const res = await fetchWithAuth("/panels/admin/plans", {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteAdminPanelPlan(id: string) {
  const res = await fetchWithAuth(`/panels/admin/plans/${id}`, { method: "DELETE" });
  return res.json();
}

export async function getAdminAllPanels() {
  const res = await fetchWithAuth("/panels/admin/all");
  return res.json();
}

export async function getOrphanHerokuApps() {
  const res = await fetchWithAuth("/admin/orphan-apps");
  return res.json();
}

export async function deleteOrphanApp(appName: string) {
  const res = await fetchWithAuth(`/admin/orphan-apps/${encodeURIComponent(appName)}`, { method: "DELETE" });
  return res.json();
}

// ============================================================
// TUTORIALS
// ============================================================
export async function getTutorials() {
  const res = await fetch(`${API_URL}/tutorials`);
  return res.json();
}

export async function getAdminTutorials() {
  const res = await fetchWithAuth("/admin/tutorials");
  return res.json();
}

export async function createAdminTutorial(data: { title: string; youtubeUrl: string; order?: number }) {
  const res = await fetchWithAuth("/admin/tutorials", {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteAdminTutorial(id: string) {
  const res = await fetchWithAuth(`/admin/tutorials/${id}`, { method: "DELETE" });
  return res.json();
}

// ============================================================
// ADS / BANNERS
// ============================================================
export async function getAds() {
  const res = await fetch(`${API_URL}/ads`);
  return res.json();
}

export async function trackAdClick(id: string) {
  return fetch(`${API_URL}/ads/${id}/click`, { method: "POST" }).catch(() => null);
}

export async function adminListAds() {
  const res = await fetchWithAuth("/ads/admin/all");
  return res.json();
}

export async function adminCreateAd(data: Record<string, unknown>) {
  const res = await fetchWithAuth("/ads/admin", { method: "POST", body: JSON.stringify(data) });
  return res.json();
}

export async function adminUpdateAd(id: string, data: Record<string, unknown>) {
  const res = await fetchWithAuth(`/ads/admin/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  return res.json();
}

export async function adminBulkAds(ids: string[], action: "activate" | "deactivate" | "delete") {
  const res = await fetchWithAuth("/ads/admin/bulk", { method: "POST", body: JSON.stringify({ ids, action }) });
  return res.json();
}

// ============================================================
// PROMO CODES
// ============================================================
export interface PromoResult {
  ok?: boolean;
  error?: string;
  code?: string;
  discountPercent?: number;
  discount?: number;
  final?: number;
}

export async function validatePromo(code: string, amount: number, scope: "topup" | "purchase" = "topup"): Promise<PromoResult> {
  const res = await fetchWithAuth("/payments/promo/validate", {
    method: "POST",
    body: JSON.stringify({ code, amount, scope })
  });
  return res.json();
}

export interface AdminPromo {
  _id: string;
  code: string;
  discountPercent: number;
  scope: "topup" | "purchase" | "all";
  maxUses: number;
  usedCount: number;
  perUserLimit: number;
  minAmount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export async function adminGetPromos(): Promise<AdminPromo[]> {
  const res = await fetchWithAuth("/admin/promos");
  return res.json();
}

export async function adminCreatePromo(payload: {
  code: string;
  discountPercent: number;
  scope?: string;
  maxUses?: number;
  perUserLimit?: number;
  minAmount?: number;
  expiresAt?: string | null;
}) {
  const res = await fetchWithAuth("/admin/promos", { method: "POST", body: JSON.stringify(payload) });
  return res.json();
}

export async function adminUpdatePromo(id: string, payload: Record<string, unknown>) {
  const res = await fetchWithAuth(`/admin/promos/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  return res.json();
}

export async function adminDeletePromo(id: string) {
  const res = await fetchWithAuth(`/admin/promos/${id}`, { method: "DELETE" });
  return res.json();
}

// ============================================================
// RECEIPTS
// ============================================================
export interface Receipt {
  receiptNo: string;
  reference: string;
  date: string;
  status: string;
  type: string;
  itemName: string;
  sqAmount: number;
  tzsAmount: number;
  method: string;
  methodLabel: string;
  channelProvider?: string;
  promoCode?: string;
  discountAmount?: number;
  customer: { username: string; email: string };
  error?: string;
}

export async function getReceipt(ref: string): Promise<Receipt> {
  const res = await fetchWithAuth(`/payments/receipt/${encodeURIComponent(ref)}`);
  return res.json();
}

export interface ReceiptSummary {
  id: string;
  reference: string;
  receiptNo: string;
  date: string;
  type: string;
  itemName: string;
  sqAmount: number;
  tzsAmount: number;
  method: string;
}

export async function getReceipts(): Promise<ReceiptSummary[]> {
  const res = await fetchWithAuth("/payments/receipts");
  return res.json();
}

// ============================================================
// APP SETTINGS
// ============================================================
export interface ChannelPopupSettings {
  enabled: boolean;
  title: string;
  text: string;
  buttonLabel: string;
  url: string;
  imageUrl: string;
  frequencyHours: number;
}

export interface DailyRewardSettings {
  enabled: boolean;
  amount: number;
  minBalance: number;
  cooldownHours: number;
}

export interface MaintenanceSettings {
  enabled: boolean;
  title: string;
  message: string;
}

export interface AppSettings {
  logoUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
  manualDeployCostTx: number;
  manualDeployEnabled: boolean;
  adSlideSeconds: number;
  channelPopup: ChannelPopupSettings;
  dailyReward: DailyRewardSettings;
  maintenance: MaintenanceSettings;
}

export async function getAppSettings(): Promise<AppSettings> {
  const res = await fetch(`${API_URL}/settings`);
  return res.json();
}

export async function updateAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const res = await fetchWithAuth("/settings", { method: "PUT", body: JSON.stringify(patch) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not save settings");
  return res.json();
}

// ============================================================
// REWARDS & ACHIEVEMENTS
// ============================================================
export interface DailyRewardState {
  enabled: boolean;
  amount: number;
  minBalance: number;
  cooldownHours: number;
  balance: number;
  eligible: boolean;
  reason: "" | "disabled" | "min_balance" | "cooldown";
  nextClaimAt: string | null;
  secondsLeft: number;
}

export interface AchievementState {
  key: string;
  title: string;
  description: string;
  icon: string;
  metric: string;
  target: number;
  rewardTx: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export async function getRewards(): Promise<{ daily: DailyRewardState; achievements: AchievementState[] }> {
  const res = await fetchWithAuth("/rewards");
  return res.json();
}

export async function claimDailyReward(): Promise<{ ok: boolean; amount: number; newBalance: number }> {
  const res = await fetchWithAuth("/rewards/daily/claim", { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not claim reward");
  return data;
}

export async function claimAchievement(key: string): Promise<{ ok: boolean; amount: number; newBalance: number }> {
  const res = await fetchWithAuth(`/rewards/achievements/${encodeURIComponent(key)}/claim`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not claim achievement");
  return data;
}

export interface AdminAchievement extends AchievementState { _id: string; active: boolean; order: number }

export async function adminGetAchievements(): Promise<AdminAchievement[]> {
  const res = await fetchWithAuth("/rewards/admin/achievements");
  return res.json();
}

export async function adminSaveAchievement(data: Record<string, unknown>, id?: string) {
  const res = await fetchWithAuth(id ? `/rewards/admin/achievements/${id}` : "/rewards/admin/achievements", {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(data),
  });
  const out = await res.json();
  if (!res.ok) throw new Error(out.error || "Could not save achievement");
  return out;
}

export async function adminDeleteAchievement(id: string) {
  await fetchWithAuth(`/rewards/admin/achievements/${id}`, { method: "DELETE" });
}

// ============================================================
// MANUAL REPO DEPLOYMENT
// ============================================================
export interface RepoInspection {
  ok: boolean;
  name: string;
  description: string;
  imageUrl: string;
  branch: string;
  repoKey: string;
  costTx: number;
  vars: { key: string; description: string; required: boolean; value: string }[];
}

export async function inspectRepo(repoUrl: string): Promise<RepoInspection> {
  const res = await fetchWithAuth("/manual-repos/inspect", { method: "POST", body: JSON.stringify({ repoUrl }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not read that repository");
  return data;
}

export async function deployManualRepo(payload: {
  repoUrl: string;
  appName: string;
  sessionVar: string;
  months?: number;
  extraVars?: Record<string, string>;
}) {
  const res = await fetchWithAuth("/manual-repos/deploy", { method: "POST", body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Deployment failed");
  return data;
}

export interface ManualRepoRecord {
  _id: string;
  userEmail: string;
  username: string;
  repoUrl: string;
  repoKey: string;
  appName: string;
  costTx: number;
  blocked: boolean;
  blockReason: string;
  createdAt: string;
}

export async function getMyRepos(): Promise<ManualRepoRecord[]> {
  const res = await fetchWithAuth("/manual-repos/mine");
  return res.json();
}

export async function adminGetRepos(page = 1, search = ""): Promise<{ items: ManualRepoRecord[]; total: number; page: number; pages: number }> {
  const res = await fetchWithAuth(`/manual-repos/admin/all?page=${page}&search=${encodeURIComponent(search)}`);
  return res.json();
}

export async function adminBlockRepo(id: string, reason: string) {
  await fetchWithAuth(`/manual-repos/admin/${id}/block`, { method: "POST", body: JSON.stringify({ reason }) });
}

export async function adminUnblockRepo(id: string) {
  await fetchWithAuth(`/manual-repos/admin/${id}/unblock`, { method: "POST" });
}

export async function adminDeleteRepo(id: string) {
  await fetchWithAuth(`/manual-repos/admin/${id}`, { method: "DELETE" });
}

// ============================================================
// DEPLOY HISTORY & REWARD HISTORY
// ============================================================
export interface DeployHistoryItem {
  id: string;
  kind: "bot" | "repo";
  appName: string;
  label: string;
  status: string;
  isTrial: boolean;
  deployedAt: string;
  expiresAt: string;
  costTx: number | null;
  cancelled: boolean;
  reason: string;
}

export async function getDeployHistory(): Promise<DeployHistoryItem[]> {
  const res = await fetchWithAuth("/bots/history");
  if (!res.ok) throw new Error("Could not load deploy history");
  return res.json();
}

export interface RewardHistoryItem {
  id: string;
  kind: "daily" | "achievement";
  key: string;
  title: string;
  icon: string;
  amount: number;
  claimedAt: string;
}

export async function getRewardHistory(): Promise<{ items: RewardHistoryItem[]; totalEarned: number; dailyCount: number }> {
  const res = await fetchWithAuth("/rewards/history");
  if (!res.ok) throw new Error("Could not load reward history");
  return res.json();
}

// ============================================================
// LEGACY / DEPRECATED
// ============================================================
export async function initiatePayment(packageId: string) {
  const res = await fetchWithAuth("/payments/initiate", {
    method: "POST",
    body: JSON.stringify({ packageId })
  });
  return res.json();
}

export async function initiateCustomPayment(tzsAmount: number, txAmount: number) {
  const res = await fetchWithAuth("/payments/initiate-custom", {
    method: "POST",
    body: JSON.stringify({ tzsAmount, txAmount })
  });
  return res.json();
}

// ============================================================
// COUPONS
// ============================================================
export async function claimCoupon(code: string) {
  const res = await fetchWithAuth("/coupons/claim", {
    method: "POST",
    body: JSON.stringify({ code })
  });
  return res.json();
}

// ============================================================
// COMMUNITY CHAT
// ============================================================
export async function getCommunityMessages(after?: string) {
  const res = await fetchWithAuth(`/community/messages${after ? `?after=${encodeURIComponent(after)}` : ""}`);
  return res.json();
}

export async function postCommunityMessage(text: string, replyTo?: string | null, clientId?: string) {
  const res = await fetchWithAuth("/community/messages", { method: "POST", body: JSON.stringify({ text, replyTo, clientId }) });
  return res.json();
}

export async function deleteCommunityMessage(id: string) {
  const res = await fetchWithAuth(`/community/messages/${id}`, { method: "DELETE" });
  return res.json();
}

export async function reportCommunityMessage(id: string, reason: string) {
  const res = await fetchWithAuth(`/community/messages/${id}/report`, { method: "POST", body: JSON.stringify({ reason }) });
  return res.json();
}

export async function hideCommunityMessage(id: string, hidden: boolean, reason?: string) {
  const res = await fetchWithAuth(`/community/messages/${id}/hide`, { method: "PATCH", body: JSON.stringify({ hidden, reason }) });
  return res.json();
}

export async function getCommunityReports(status = "open") {
  const res = await fetchWithAuth(`/community/reports?status=${status}`);
  return res.json();
}

export async function updateCommunityReport(id: string, status: "resolved" | "dismissed") {
  const res = await fetchWithAuth(`/community/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  return res.json();
}

export async function batchModerate(payload: {
  reportIds?: string[];
  messageIds?: string[];
  action: "hide" | "unhide" | "delete" | "reviewed" | "dismiss";
  reason?: string;
}) {
  const res = await fetchWithAuth("/community/moderation/batch", { method: "POST", body: JSON.stringify(payload) });
  return res.json();
}

export async function getAuditLogs(params: {
  action?: string;
  q?: string;
  actor?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
} = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
  const res = await fetchWithAuth(`/staff/audit?${qs.toString()}`);
  return res.json();
}

// ============================================================
// LIVE COMMUNITY STREAM (SSE)
// ============================================================
export function subscribeCommunity(
  onEvent: (event: string, data: Record<string, unknown>) => void,
  onStateChange?: (connected: boolean) => void,
  onReconnect?: () => void
): () => void {
  const controller = new AbortController();
  let stopped = false;
  let attempt = 0;
  let hadConnection = false;

  const run = async () => {
    while (!stopped) {
      try {
        const res = await fetchWithAuth("/community/stream", {
          headers: { Accept: "text/event-stream" },
          signal: controller.signal
        });
        if (!res.ok || !res.body) throw new Error("stream failed");
        attempt = 0;
        onStateChange?.(true);
        if (hadConnection) onReconnect?.();
        hadConnection = true;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";
          for (const chunk of chunks) {
            let name = "message";
            let payload = "";
            for (const line of chunk.split("\n")) {
              if (line.startsWith("event:")) name = line.slice(6).trim();
              else if (line.startsWith("data:")) payload += line.slice(5).trim();
            }
            if (!payload) continue;
            try { onEvent(name, JSON.parse(payload)); } catch { /* ignore */ }
          }
        }
      } catch {
        if (stopped) return;
      }
      onStateChange?.(false);
      if (stopped) return;
      attempt += 1;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 20000) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  };
  run();

  return () => {
    stopped = true;
    controller.abort();
    onStateChange?.(false);
  };
}

// ============================================================
// STAFF / ROLES
// ============================================================
export async function staffMe() {
  const res = await fetchWithAuth("/staff/me");
  return res.json();
}

export async function staffUsers(q = "") {
  const res = await fetchWithAuth(`/staff/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  return res.json();
}

export async function staffGrantSq(username: string, amount: number, reason?: string) {
  const res = await fetchWithAuth("/staff/grant-sq", { method: "POST", body: JSON.stringify({ username, amount, reason }) });
  return res.json();
}

export async function staffCoupons() {
  const res = await fetchWithAuth("/staff/coupons");
  return res.json();
}

export async function staffCreateCoupons(txAmount: number, quantity: number, code?: string) {
  const res = await fetchWithAuth("/staff/coupons", { method: "POST", body: JSON.stringify({ txAmount, quantity, code }) });
  return res.json();
}

export async function staffDeleteCoupons(ids: string[]) {
  const res = await fetchWithAuth("/staff/coupons/bulk-delete", { method: "POST", body: JSON.stringify({ ids }) });
  return res.json();
}

export async function staffSetRole(id: string, role: "user" | "subadmin" | "admin") {
  const res = await fetchWithAuth(`/staff/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
  return res.json();
}

// ============================================================
// MCP / AGENT
// ============================================================
export async function createMcpToken() {
  const res = await fetchWithAuth("/mcp/token", { method: "POST" });
  return res.json();
}

// ============================================================
// ADMIN BLOCKED DEVICES
// ============================================================
export interface BlockedDevice {
  id: string;
  ip: string;
  fingerprint: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface BlockedTrialRow {
  id: string;
  phoneNumber: string;
  email: string;
  createdAt: string;
}

export async function adminBlockedDevices(q = ""): Promise<{ devices: BlockedDevice[]; trials: BlockedTrialRow[] }> {
  const res = await fetchWithAuth(`/admin/blocked-devices${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  return res.json();
}

export async function adminUnblockDevice(id: string) {
  const res = await fetchWithAuth(`/admin/blocked-devices/ip/${id}`, { method: "DELETE" });
  return res.json();
}

export async function adminUnblockTrial(id: string) {
  const res = await fetchWithAuth(`/admin/blocked-devices/trial/${id}`, { method: "DELETE" });
  return res.json();
}

// ============================================================
// MANUAL PAYMENTS
// ============================================================
export async function manualPaymentConfig() {
  const res = await fetch(`${API_URL}/manual-payments/config`);
  return res.json();
}

export async function submitManualPayment(data: Record<string, unknown>) {
  const res = await fetchWithAuth("/manual-payments", { method: "POST", body: JSON.stringify(data) });
  return res.json();
}

export async function myManualPayments() {
  const res = await fetchWithAuth("/manual-payments/mine");
  return res.json();
}

export async function adminManualPayments(status = "all") {
  const res = await fetchWithAuth(`/manual-payments/admin/all?status=${status}`);
  return res.json();
}

export async function adminReviewManualPayments(ids: string[], action: "approve" | "reject" | "delete", adminNote?: string) {
  const res = await fetchWithAuth("/manual-payments/admin/review", { method: "POST", body: JSON.stringify({ ids, action, adminNote }) });
  return res.json();
}

export async function adminManualPaymentProof(id: string) {
  const res = await fetchWithAuth(`/manual-payments/admin/${id}/proof`);
  return res.json();
}

// ============================================================
// DATABASE BACKUPS
// ============================================================
export async function adminListBackups() {
  const res = await fetchWithAuth("/backups");
  return res.json();
}

export async function adminBackupCollections() {
  const res = await fetchWithAuth("/backups/collections");
  return res.json();
}

export async function adminCreateBackup(name?: string, collections?: string[]) {
  const res = await fetchWithAuth("/backups", { method: "POST", body: JSON.stringify({ name, collections }) });
  return res.json();
}

export async function adminRestoreBackup(id: string) {
  const res = await fetchWithAuth(`/backups/${id}/restore`, { method: "POST" });
  return res.json();
}

export async function adminDeleteBackups(ids: string[]) {
  const res = await fetchWithAuth("/backups/delete", { method: "POST", body: JSON.stringify({ ids }) });
  return res.json();
}

export function backupDownloadUrl(id: string) {
  return `${API_URL}/backups/${id}/download`;
}

// ============================================================
// PETERPAY WEBHOOK LOGS
// ============================================================
export async function getWebhookLogs(params: { status?: string; q?: string; page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
  const res = await fetchWithAuth(`/payments/webhook-logs?${qs.toString()}`);
  return res.json();
}

export async function getWebhookAttempts(orderId: string) {
  const res = await fetchWithAuth(`/payments/webhook-logs/${encodeURIComponent(orderId)}`);
  return res.json();
}

// ============================================================
// ADMIN BOT TEMPLATES
// ============================================================
export async function adminGetAllTemplates() {
  const res = await fetchWithAuth("/bot-templates/admin/all");
  return res.json();
}

export async function adminUpdateTemplate(id: string, patch: Record<string, unknown>) {
  const res = await fetchWithAuth(`/bot-templates/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not update template");
  return data;
}
// ============================================================
// NOTIFICATIONS (admin broadcasts)
// ============================================================
export interface AppNotification {
  _id: string;
  title: string;
  body: string;
  url: string;
  level: "info" | "success" | "warning";
  active: boolean;
  createdAt: string;
}

export async function getNotifications(): Promise<AppNotification[]> {
  const res = await fetchWithAuth("/notifications");
  if (!res.ok) return [];
  return (await res.json()).items || [];
}

export async function adminGetNotifications(): Promise<AppNotification[]> {
  const res = await fetchWithAuth("/notifications/all");
  if (!res.ok) return [];
  return (await res.json()).items || [];
}

export async function adminCreateNotification(payload: { title: string; body?: string; url?: string; level?: string }) {
  const res = await fetchWithAuth("/notifications", { method: "POST", body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not send notification");
  return data;
}

export async function adminUpdateNotification(id: string, patch: Record<string, unknown>) {
  const res = await fetchWithAuth(`/notifications/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not update notification");
  return data;
}

export async function adminDeleteNotification(id: string) {
  await fetchWithAuth(`/notifications/${id}`, { method: "DELETE" });
}

// ============================================================
// DEVELOPER API KEYS (STANY-xxxx)
// ============================================================

export interface ApiKeySummary {
  _id: string;
  name: string;
  masked: string;
  active: boolean;
  callCount: number;
  sqSpent: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ApiUsageRow {
  endpoint: string;
  method: string;
  cost: number;
  status: number;
  createdAt: string;
}

export async function getApiKeys(): Promise<ApiKeySummary[]> {
  const res = await fetchWithAuth("/keys");
  const data = await res.json();
  return data.keys || [];
}

export async function createApiKey(name?: string) {
  const res = await fetchWithAuth("/keys", { method: "POST", body: JSON.stringify({ name }) });
  return res.json();
}

export async function revealApiKey(id: string): Promise<string> {
  const res = await fetchWithAuth(`/keys/${id}/reveal`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not reveal key");
  return data.key as string;
}

export async function regenerateApiKey(id: string): Promise<string> {
  const res = await fetchWithAuth(`/keys/${id}/regenerate`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not regenerate key");
  return data.key as string;
}

export async function setApiKeyActive(id: string, active: boolean) {
  const res = await fetchWithAuth(`/keys/${id}`, { method: "PATCH", body: JSON.stringify({ active }) });
  return res.json();
}

export async function deleteApiKey(id: string) {
  await fetchWithAuth(`/keys/${id}`, { method: "DELETE" });
}

export async function getApiUsage(): Promise<ApiUsageRow[]> {
  const res = await fetchWithAuth("/keys/usage/recent");
  const data = await res.json();
  return data.usage || [];
}

export async function validateCoupon(code: string) {
  const res = await fetchWithAuth(`/coupons/validate/${encodeURIComponent(code)}`);
  return res.json();
}

// ============================================================
// SOCIAL MEDIA BOOSTING (SMM)
// ============================================================

export interface SmmServiceRow {
  _id: string;
  serviceId: number;
  provider: string;
  name: string;
  category: string;
  platform?: string;
  pricePer1000Sq: number;
  min: number;
  max: number;
  description?: string;
}

export interface SmmOrderRow {
  _id: string;
  serviceId: number;
  provider: string;
  serviceName: string;
  link: string;
  quantity: number;
  priceSq: number;
  status: "pending" | "processing" | "completed" | "partial" | "failed" | "refunded" | "canceled";
  remoteOrderId?: string;
  startCount?: number;
  remains?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getSmmServices(params: { q?: string; category?: string } = {}): Promise<SmmServiceRow[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.category) qs.set("category", params.category);
  const res = await fetch(`${API_URL}/smm/services?${qs.toString()}`);
  const data = await res.json();
  return data.services || [];
}

export async function getSmmCategories(): Promise<string[]> {
  const res = await fetch(`${API_URL}/smm/categories`);
  const data = await res.json();
  return data.categories || [];
}

export async function placeSmmOrder(input: { serviceId: number; provider?: string; link: string; quantity: number }) {
  const res = await fetchWithAuth("/smm/orders", { method: "POST", body: JSON.stringify(input) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not place the order");
  return data as { ok: true; order: Record<string, unknown>; charged: number; balance: number };
}

export async function getSmmOrders(): Promise<SmmOrderRow[]> {
  const res = await fetchWithAuth("/smm/orders");
  const data = await res.json();
  return data.orders || [];
}

export async function getSmmOrder(id: string): Promise<SmmOrderRow> {
  const res = await fetchWithAuth(`/smm/orders/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Order not found");
  return data.order;
}

// ============================================================
// LINKED WHATSAPP BOT (10 SQ)
// ============================================================

export interface LinkBotRow {
  _id: string;
  code: string;
  username: string;
  displayName: string;
  logoUrl: string;
  phoneNumber: string;
  channelJid: string;
  autoFollowChannel: boolean;
  autoReactChannel: boolean;
  antilink: boolean;
  antilinkAction: "warn" | "delete" | "kick";
  antiStatusMention: boolean;
  antiMention: boolean;
  prefix: string;
  menuFooter: string;
  status: "pending" | "linked" | "paused";
  priceSq: number;
  createdAt: string;
}

export interface LinkBotCommand {
  name: string;
  category: string;
  description: string;
  usage?: string;
  adminOnly?: boolean;
}

export async function getLinkBotCommands(): Promise<{ total: number; categories: string[]; commands: LinkBotCommand[] }> {
  const res = await fetch(`${API_URL}/linkbot/commands`);
  return res.json();
}

export async function getMyLinkBots(): Promise<{ bots: LinkBotRow[]; priceSq: number }> {
  const res = await fetchWithAuth("/linkbot/my");
  const data = await res.json();
  return { bots: data.bots || [], priceSq: data.priceSq ?? 10 };
}

export async function createLinkBot(input: { username: string; displayName?: string; logoUrl?: string; phoneNumber?: string; channelJid?: string }) {
  const res = await fetchWithAuth("/linkbot", { method: "POST", body: JSON.stringify(input) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not create the bot");
  return data as { ok: true; bot: LinkBotRow; charged: number; balance: number };
}

export async function updateLinkBot(id: string, patch: Partial<LinkBotRow>) {
  const res = await fetchWithAuth(`/linkbot/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not save settings");
  return data.bot as LinkBotRow;
}

export async function deleteLinkBot(id: string) {
  await fetchWithAuth(`/linkbot/${id}`, { method: "DELETE" });
}

export async function getLinkBotMenu(id: string): Promise<{ menu: string; logoUrl: string; bots: { name: string; slug: string; priceSq: number }[] }> {
  const res = await fetchWithAuth(`/linkbot/${id}/menu`);
  return res.json();
}

// ============================================================
// WEBSITE HOSTING + CUSTOM DOMAIN
// ============================================================

export interface WebsiteRow {
  _id: string;
  appName: string;
  sourceUrl: string;
  herokuUrl: string;
  customDomain: string;
  dnsTarget: string;
  domainStatus: "none" | "pending" | "active" | "failed";
  status: "deploying" | "running" | "stopped" | "failed";
  priceSq: number;
  createdAt: string;
}

export async function getMyWebsites(): Promise<{ sites: WebsiteRow[]; pricing: { websiteSq: number; domainSq: number } }> {
  const res = await fetchWithAuth("/websites/my");
  const data = await res.json();
  return { sites: data.sites || [], pricing: data.pricing || { websiteSq: 50, domainSq: 20 } };
}

export async function createWebsite(input: { appName: string; sourceUrl: string }) {
  const res = await fetchWithAuth("/websites", { method: "POST", body: JSON.stringify(input) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not deploy the website");
  return data.site as WebsiteRow;
}

export async function getWebsiteStatus(id: string): Promise<WebsiteRow> {
  const res = await fetchWithAuth(`/websites/${id}/status`);
  const data = await res.json();
  return data.site;
}

export async function attachDomain(id: string, domain: string): Promise<WebsiteRow> {
  const res = await fetchWithAuth(`/websites/${id}/domain`, { method: "POST", body: JSON.stringify({ domain }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not attach the domain");
  return data.site;
}

export async function checkDomain(id: string): Promise<WebsiteRow> {
  const res = await fetchWithAuth(`/websites/${id}/domain`);
  const data = await res.json();
  return data.site;
}

export async function deleteWebsite(id: string) {
  await fetchWithAuth(`/websites/${id}`, { method: "DELETE" });
}
