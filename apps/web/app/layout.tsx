import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "링구링구 — 우리, 한 판 더.",
  description:
    "친구와 마주 앉는 가장 쉬운 방법. 링크 하나로 모여, 같은 테이블에서 즐기는 보드게임.",
  applicationName: "링구링구",
  referrer: "no-referrer",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
