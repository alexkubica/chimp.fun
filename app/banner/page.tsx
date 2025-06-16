import BannerPageClient from "./BannerPageClient";

export const metadata = {
  title: "Banner Maker | CHIMP.FUN",
  icons: [
    { rel: "icon", url: "/icon.png" },
    { rel: "apple-touch-icon", url: "/icon.png" },
  ],
};

export default function BannerPage() {
  return <BannerPageClient />;
}
