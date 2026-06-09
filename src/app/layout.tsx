import type { Metadata, Viewport } from 'next';
import 'styles/globals.scss';

export const metadata: Metadata = {
  title: '빠따 디펜스',
  description: '몰려오는 몹을 빠따로 쳐서 막아라. 폴리볼 미니게임.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#fff7ea',
};

type Props = Readonly<{ children: React.ReactNode }>;

export default function RootLayout({ children }: Props) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
