import { MaintenanceGate } from "@/components/MaintenanceGate";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from "react-router";
  import { AuthProvider, useAuth } from "@/hooks/useAuth";
  import { ToastProvider } from "@/hooks/useToast";
  import { I18nProvider } from "@/lib/i18n";
  import { Login } from "@/pages/Login";
  import { Signup } from "@/pages/Signup";
  import { Dashboard } from "@/pages/Dashboard";
  import { Admin } from "@/pages/Admin";
  import TopUp from "@/pages/TopUp";
  import { Profile } from "@/pages/Profile";
  import { Docs } from "@/pages/Docs";
  import { Deploy } from "@/pages/Deploy";
  import { ServicesBots } from "@/pages/ServicesBots";
  import { ServicesPanel } from "@/pages/ServicesPanel";
  import { MyBots } from "@/pages/MyBots";
  import HistoryPage from "@/pages/History";
  import { PurchasePanels } from "@/pages/PurchasePanels";
  import { MyPanels } from "@/pages/MyPanels";
  import { BotDeployPage } from "@/pages/BotDeployPage";
  import { Tutorials } from "@/pages/Tutorials";
  import { SendCoins } from "@/pages/SendCoins";
  import { ClaimCoins } from "@/pages/ClaimCoins";
  import { Contact } from "@/pages/Contact";
  import { VerifyEmail } from "@/pages/VerifyEmail";
  import { Community } from "@/pages/Community";
  import { Staff } from "@/pages/Staff";
  import { AgentIntegrations } from "@/pages/AgentIntegrations";
  import { ApiKeys } from "@/pages/ApiKeys";
  import { NotFound } from "@/pages/NotFound";
  import Home from "@/pages/Home";
  import ReceiptPage from "@/pages/Receipt";
  import { PageLoader } from "@/components/PageLoader";
  import { RouteSeo } from "@/components/RouteSeo";
  import { AppBootLoader } from "@/components/AppBootLoader";
  import { AppSettingsProvider } from "@/hooks/useAppSettings";
  import { ChannelPopup } from "@/components/ChannelPopup";
  import { DeployRepo } from "@/pages/DeployRepo";
  import SmmBoost from "@/pages/SmmBoost";
  import MySmmOrders from "@/pages/MySmmOrders";
  import LinkBotPage from "@/pages/LinkBotPage";
  import WebHosting from "@/pages/WebHosting";
  import GamesStore from "@/pages/GamesStore";
  import GameDetail from "@/pages/GameDetail";
  import MoviesStore from "@/pages/MoviesStore";
  import MovieDetail from "@/pages/MovieDetail";
  import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

  interface NavLoadingContextType {
    navigateWithLoader: (path: string) => void;
  }

  const NavLoadingContext = createContext<NavLoadingContextType>({
    navigateWithLoader: () => {}
  });

  export function useNavLoader() {
    return useContext(NavLoadingContext);
  }

  function NavLoadingProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const navigateWithLoader = useCallback((path: string) => {
      setLoading(true);
      setTimeout(() => {
        navigate(path);
        setLoading(false);
      }, 400);
    }, [navigate]);

    if (loading) return <PageLoader />;

    return (
      <NavLoadingContext.Provider value={{ navigateWithLoader }}>
        {children}
      </NavLoadingContext.Provider>
    );
  }

  function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [pathname]);
    return null;
  }

  function RootRedirect() {
    const { loading, user } = useAuth();
    if (loading) return <PageLoader />;
    // Signed-in users always land straight on their dashboard.
    if (user) return <Navigate to="/dashboard" replace />;
    return <Home />;
  }

  function AppRoutes() {
    return (
      <NavLoadingProvider>
        <ScrollToTop />
        <RouteSeo />
        <MaintenanceGate>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/community" element={<Community />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/integrations" element={<AgentIntegrations />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/" element={<Home />} />
          <Route path="/games" element={<GamesStore />} />
          <Route path="/games/:slug" element={<GameDetail />} />
          <Route path="/movies" element={<MoviesStore />} />
          <Route path="/movies/:slug" element={<MovieDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/topup" element={<TopUp />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/deploy" element={<Deploy />} />
          <Route path="/deploy/repo" element={<DeployRepo />} />
          <Route path="/services/bots" element={<ServicesBots />} />
          <Route path="/services/bots/:slug" element={<BotDeployPage />} />
          <Route path="/services/panels" element={<ServicesPanel />} />
          <Route path="/services/panels/mypanels" element={<MyPanels />} />
          <Route path="/services/panels/purchasepanel" element={<PurchasePanels />} />
          <Route path="/mybots" element={<MyBots />} />
          <Route path="/smm" element={<SmmBoost />} />
          <Route path="/smm/orders" element={<MySmmOrders />} />
          <Route path="/linkbot" element={<LinkBotPage />} />
          <Route path="/hosting" element={<WebHosting />} />
          <Route path="/mypanels" element={<MyPanels />} />
          <Route path="/tutorials" element={<Tutorials />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/send-coins" element={<SendCoins />} />
          <Route path="/claim/:code" element={<ClaimCoins />} />
          <Route path="/receipt/:ref" element={<ReceiptPage />} />
          <Route path="/history" element={<HistoryPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </MaintenanceGate>

      </NavLoadingProvider>
    );
  }

  function AppBootWrapper({ children }: { children: ReactNode }) {
    const { loading } = useAuth();
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);

    useEffect(() => {
      const t = setTimeout(() => setMinTimeElapsed(true), 2200);
      return () => clearTimeout(t);
    }, []);

    if (loading || !minTimeElapsed) return <AppBootLoader />;
    return <>{children}</>;
  }

  function App() {
    return (
      <I18nProvider>
      <AppSettingsProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppBootWrapper>
              <AppRoutes />
              <ChannelPopup />
            </AppBootWrapper>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
      </AppSettingsProvider>
      </I18nProvider>
    );
  }


  export default App;
  