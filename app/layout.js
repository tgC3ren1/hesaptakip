import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "Hesap Takip",
  description: "Yatırım ve çekim takip uygulaması",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
