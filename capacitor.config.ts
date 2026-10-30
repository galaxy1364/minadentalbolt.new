export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  server?: Record<string, any>;
  plugins?: Record<string, any>;
  android?: Record<string, any>;
  ios?: Record<string, any>;
}

const config: CapacitorConfig = {
  appId: 'ir.minadental.app',
  appName: 'مینادنتال',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#7c3aed',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#020617',
      overlaysWebView: false
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK'
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'MinaDental'
  }
};

export default config;
