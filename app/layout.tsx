import RootLayout from "./components/RootLayout";
import "./globals.css";

export const metadata = {
  title: "chimp.fun",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log("layout!");
  return <RootLayout>{children}</RootLayout>;
}
