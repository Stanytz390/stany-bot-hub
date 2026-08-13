import { APP_LOGO_URL } from "@/components/AppLogo";

export function AppBootLoader() {
  return (
    <div className="app-boot-loader">
      <style>{`
        .app-boot-loader {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.75rem;
          background:
            radial-gradient(900px 480px at 50% -10%, hsl(var(--primary) / .16), transparent 70%),
            hsl(var(--background));
          animation: boot-fade-in .3s ease forwards;
        }
        @keyframes boot-fade-in { from { opacity: 0 } to { opacity: 1 } }

        .boot-orb {
          position: relative;
          width: 96px;
          height: 96px;
          display: grid;
          place-items: center;
        }
        .boot-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: hsl(var(--primary));
          border-right-color: hsl(var(--primary) / .35);
          animation: boot-spin 1.1s cubic-bezier(.55,.15,.35,.85) infinite;
        }
        .boot-ring:nth-child(2) {
          inset: 12px;
          border-top-color: hsl(var(--primary) / .55);
          border-right-color: transparent;
          animation-duration: 1.7s;
          animation-direction: reverse;
        }
        .boot-core {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          object-fit: cover;
          box-shadow: 0 0 44px hsl(var(--primary) / .5);
          animation: boot-pulse 2.2s ease-in-out infinite;
        }
        @keyframes boot-spin { to { transform: rotate(360deg) } }
        @keyframes boot-pulse {
          0%, 100% { transform: scale(1) }
          50% { transform: scale(.9) }
        }

        .boot-brand {
          font-family: Sora, "Plus Jakarta Sans", sans-serif;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: hsl(var(--foreground));
        }
        .boot-brand span {
          background: linear-gradient(92deg, hsl(var(--primary)), hsl(var(--primary) / .6));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .boot-bar {
          width: 168px;
          height: 3px;
          border-radius: 99px;
          overflow: hidden;
          background: hsl(var(--primary) / .14);
        }
        .boot-bar i {
          display: block;
          height: 100%;
          width: 42%;
          border-radius: 99px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary)), transparent);
          animation: boot-slide 1.25s ease-in-out infinite;
        }
        @keyframes boot-slide {
          0% { transform: translateX(-110%) }
          100% { transform: translateX(260%) }
        }
        .boot-tag {
          font-size: 10px;
          letter-spacing: .28em;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground));
        }
      `}</style>
      <div className="boot-orb">
        <div className="boot-ring" />
        <div className="boot-ring" />
        <img src={APP_LOGO_URL} alt="Stany Hosting" className="boot-core" />
      </div>
      <div className="boot-brand">STANY <span>HOSTING</span></div>
      <div className="boot-bar"><i /></div>
      <div className="boot-tag">Preparing your dashboard</div>
    </div>
  );
}
