interface AppLogoProps {
  className?: string;
}

export const APP_LOGO_URL =
  "https://www.image2url.com/r2/default/images/1785618177825-5b3fb0ba-cb13-44e3-8010-43af4a311fd4.jpg";

export function AppLogoIcon({ className = "w-4 h-4" }: AppLogoProps) {
  return (
    <img
      src={APP_LOGO_URL}
      alt="Stany Host logo"
      loading="lazy"
      className={`inline-block object-cover rounded-lg select-none ${className}`}
    />
  );
}
