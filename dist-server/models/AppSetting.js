import mongoose from "mongoose";
const AppSettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String, default: "" },
});
export const AppSetting = mongoose.model("AppSetting", AppSettingSchema);
export const DEFAULT_SETTINGS = {
    logoUrl: "https://www.image2url.com/r2/default/images/1785618177825-5b3fb0ba-cb13-44e3-8010-43af4a311fd4.jpg",
    faviconUrl: "https://www.image2url.com/r2/default/images/1785618177825-5b3fb0ba-cb13-44e3-8010-43af4a311fd4.jpg",
    ogImageUrl: "https://www.image2url.com/r2/default/images/1785618177825-5b3fb0ba-cb13-44e3-8010-43af4a311fd4.jpg",
    manualDeployCostTx: 20,
    adSlideSeconds: 6,
    manualDeployEnabled: true,
    channelPopup: {
        enabled: false,
        title: "Follow our channel",
        text: "Join the Stany Hosting channel for updates, offers and support.",
        buttonLabel: "Follow now",
        url: "",
        imageUrl: "",
        frequencyHours: 24,
    },
    maintenance: {
        enabled: false,
        title: "We are doing a quick upgrade",
        message: "Stany Hosting is under maintenance. Please check back shortly.",
    },
    dailyReward: {
        enabled: true,
        amount: 4,
        minBalance: 30,
        cooldownHours: 24,
    },
};
export async function getSettings() {
    const rows = await AppSetting.find().lean();
    const out = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
        const key = row.key;
        const value = row.value;
        if (value === null || value === undefined)
            continue;
        const base = DEFAULT_SETTINGS[key];
        if (base && typeof base === "object" && !Array.isArray(base) && typeof value === "object") {
            out[key] = { ...base, ...value };
        }
        else {
            out[key] = value;
        }
    }
    return out;
}
export async function getSetting(key) {
    const all = await getSettings();
    return all[key];
}
