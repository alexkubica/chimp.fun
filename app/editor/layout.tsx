import RootLayout from "../components/RootLayout";
import "../globals.css";

export const metadata = {
  title: "chimp.fun - NFT Editor",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RootLayout>{children}</RootLayout>;
}
