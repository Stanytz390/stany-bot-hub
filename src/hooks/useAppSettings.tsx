import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getAppSettings, type AppSettings } from "@/lib/api";

const FALLBACK: AppSettings = {
  logoUrl: "https://www.image2url.com/r2/default/images/1785618177825-5b3fb0ba-cb13-44e3-8010-43af4a311fd4.jpg",
  faviconUrl: "https://www.image2url.com/r2/default/images/1785618177825-5b3fb0ba-cb13-44e3-8010-43af4a311fd4.jpg",
  ogImageUrl: "https://www.image2url.com/r2/default/images/1785618177825-5b3fb0ba-cb13-44e3-8010-43af4a311fd4.jpg",
  manualDeployCostTx: 20,
  manualDeployEnabled: true,
  adSlideSeconds: 6,

  channelPopup: { enabled: false, title: "", text: "", buttonLabel: "Follow", url: "", imageUrl: "", frequencyHours: 24 },
  dailyReward: { enabled: true, amount: 4, minBalance: 30, cooldownHours: 24 },
  maintenance: { enabled: false, title: "", message: "" },
};

interface Ctx { settings: AppSettings; reload: () => void }

const SettingsContext = createContext<Ctx>({ settings: FALLBACK, reload: () => {} });

export function useAppSettings() {
  return useContext(SettingsContext);
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(FALLBACK);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    getAppSettings()
      .then((s) => { if (alive && s && typeof s === "object") setSettings({ ...FALLBACK, ...s }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [tick]);

  useEffect(() => {
    if (!settings.faviconUrl) return;
    const link = (document.querySelector("link[rel='icon']") as HTMLLinkElement) || document.createElement("link");
    link.rel = "icon";
    link.href = settings.faviconUrl;
    document.head.appendChild(link);
  }, [settings.faviconUrl]);

  return (
    <SettingsContext.Provider value={{ settings, reload: () => setTick((t) => t + 1) }}>
      {children}
    </SettingsContext.Provider>
  );
}
