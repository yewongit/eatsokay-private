import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 이 앱은 정적 자산 외에 next/image를 쓰지 않는다.
  // 메뉴판 이미지는 업로드 후 참조를 버리므로 최적화 대상이 아니다.
  images: { unoptimized: true },
};

export default nextConfig;
