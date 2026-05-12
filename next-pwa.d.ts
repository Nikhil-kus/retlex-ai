declare module 'next-pwa' {
  import { NextConfig } from 'next';
  function withPWA(config: object): (nextConfig: NextConfig) => NextConfig;
  export = withPWA;
}
