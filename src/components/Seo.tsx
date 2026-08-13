import { Helmet } from "react-helmet-async";
import { APP_LOGO_URL } from "@/components/AppLogo";

export const SITE_NAME = "Stany Hosting";
export const OG_IMAGE = APP_LOGO_URL;

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: string;
}

export function Seo({ title, description, path = "/", image = OG_IMAGE, type = "website" }: SeoProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={path} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={path} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
