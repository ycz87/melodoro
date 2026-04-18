import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.cosmelon.clock',
  appName: 'Melodoro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
