import type { Metadata, Viewport } from 'next';
import AppHeader from '@/components/AppHeader';
import { I18nProvider } from '@/lib/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: 'K-Food Lens',
  description:
    '한국 식당 메뉴판을 촬영해 재료와 알레르기 유발물질을 확인하고, 매장 직원에게 보여줄 질문 카드를 만듭니다.',
  applicationName: 'K-Food Lens',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 질문 카드를 확대해 보여줄 수 있어야 하므로 확대를 막지 않는다.
  maximumScale: 5,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <I18nProvider>
          <div className="app-shell">
            <AppHeader />
            <main id="main" className="app-main">
              {children}
            </main>
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
