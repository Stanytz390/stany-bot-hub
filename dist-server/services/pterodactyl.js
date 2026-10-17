// ========================================================
//  PTERODACTYL CONFIGURATION (hardcoded)
// ========================================================
const PTERODACTYL_URL = "https://panel.stanymaxhub.online";
const PTERODACTYL_APPLICATION_TOKEN = "ptla_XFOAveaYOzuUyJGHNtnn1yiC6hrVbwkuRTkmR2fEMgk";
const PTERODACTYL_NODE_ID = 1;
const PTERODACTYL_LOCATION_ID = 1;
const PTERODACTYL_NEST_ID = 7;
const PTERODACTYL_EGG_ID = 16;
// Use the original generic Node image (Node v20)
const PTERODACTYL_DOCKER_IMAGE = "ghcr.io/parkervcp/yolks:nodejs_25";
// ========================================================
//  PANEL API FETCH
// ========================================================
async function panelFetch(path, options = {}) {
    const res = await fetch(`${PTERODACTYL_URL}/api/application${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${PTERODACTYL_APPLICATION_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(options.headers ?? {}),
        },
    });
    if (res.status === 401)
        throw new Error("Panel authentication failed — verify token");
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.errors?.[0]?.detail ?? `Panel API error ${res.status}`);
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
// ========================================================
//  EXPORTED FUNCTIONS
// ========================================================
export async function findPanelUser(username) {
    const res = await panelFetch(`/users?filter[username]=${encodeURIComponent(username)}`);
    const found = res.data.find((u) => u.attributes.username === username);
    return found ? found.attributes : null;
}
export async function createPanelUser(username, email, password) {
    const res = await panelFetch("/users", {
        method: "POST",
        body: JSON.stringify({
            email,
            username,
            first_name: username,
            last_name: "User",
            language: "en",
            password,
            root_admin: false,
        }),
    });
    return res.attributes;
}
export async function updatePanelUserPassword(userId, username, email, password) {
    await panelFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
            email,
            username,
            first_name: username,
            last_name: "User",
            language: "en",
            password,
        }),
    });
}
export async function promoteToAdmin(userId, username, email) {
    await panelFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
            email,
            username,
            first_name: username,
            last_name: "User",
            language: "en",
            root_admin: true,
        }),
    });
}
export async function getFreeAllocation() {
    let page = 1;
    while (true) {
        const res = await panelFetch(`/nodes?include=allocations&page=${page}`);
        for (const nodeData of res.data) {
            const allocs = nodeData.attributes.relationships?.allocations?.data ?? [];
            const free = allocs.find((a) => !a.attributes.assigned);
            if (free)
                return free.attributes.id;
        }
        const totalPages = res.meta?.pagination?.total_pages ?? 1;
        if (page >= totalPages || res.data.length === 0)
            break;
        page++;
    }
    throw new Error("No free allocations available — add more in the panel admin");
}
export async function createPanelServer(params) {
    const res = await panelFetch("/servers", {
        method: "POST",
        body: JSON.stringify({
            name: params.name,
            user: params.panelUserId,
            egg: PTERODACTYL_EGG_ID,
            docker_image: PTERODACTYL_DOCKER_IMAGE,
            // Install all dependencies (ignore engine) then start
            startup: "npm install --ignore-engines --no-update-notifier && npm start",
            environment: {
                INST: "npm",
                USER_UPLOAD: "0",
                AUTO_UPDATE: "0",
                CMD_START: "npm start",
                MAIN_FILE: "index.js",
                NODE_ENV: "production",
                // Disable npm engine checks and update notifier
                NPM_CONFIG_ENGINE_STRICT: "false",
                NPM_CONFIG_UPDATE_NOTIFIER: "false",
                NO_UPDATE_NOTIFIER: "true",
                SKIP_NPM_UPDATE: "true",
            },
            limits: {
                memory: params.memoryMb, // No minimum enforced – use exact value
                swap: 0,
                disk: params.diskMb, // No minimum enforced – use exact value
                io: 500,
                cpu: params.cpu,
            },
            feature_limits: { databases: 1, backups: 1, allocations: 5 },
            allocation: { default: params.allocationId },
        }),
    });
    return res.attributes;
}
