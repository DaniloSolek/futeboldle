import "./globals.css";

export const metadata = {
  title: "Futeboldle",
  description: "Adivinhe o time de futebol brasileiro do dia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
