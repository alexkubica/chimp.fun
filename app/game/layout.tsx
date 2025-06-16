export const metadata = {
  title: "Game | CHIMP.FUN",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#000",
          overflow: "hidden",
        }}
      >
        {children}
      </body>
    </html>
  );
}
