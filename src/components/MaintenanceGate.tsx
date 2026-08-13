import { Wrench } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuth } from "@/hooks/useAuth";

/** Blocks the app for regular users while maintenance mode is on. */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { settings } = useAppSettings();
  const { isAdmin } = useAuth() as unknown as { isAdmin?: boolean };
  const maint = settings.maintenance;

  if (!maint?.enabled || isAdmin) return <>{children}</>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="rounded-3xl border border-primary/20 bg-card p-10">
        <Wrench className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{maint.title || "We are doing a quick upgrade"}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          {maint.message || "Stany Hosting is under maintenance. Please check back shortly."}
        </p>
      </div>
    </main>
  );
}
