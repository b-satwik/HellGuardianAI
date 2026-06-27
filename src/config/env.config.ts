export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

export class EnvConfig {
  private static getVar(key: string, defaultValue: string = ''): string {
    const value = (import.meta as any).env[key];
    return value !== undefined && value !== null && value !== '' ? String(value) : defaultValue;
  }

  public static get geminiProxyUrl(): string {
    return this.getVar('VITE_GEMINI_PROXY_URL', '');
  }

  public static get oauth(): OAuthConfig {
    return {
      clientId: this.getVar('VITE_OAUTH_CLIENT_ID', ''),
      clientSecret: this.getVar('VITE_OAUTH_CLIENT_SECRET', ''),
    };
  }

  public static get firebase(): FirebaseConfig {
    return {
      apiKey: this.getVar('VITE_FIREBASE_API_KEY', ''),
      authDomain: this.getVar('VITE_FIREBASE_AUTH_DOMAIN', ''),
      projectId: this.getVar('VITE_FIREBASE_PROJECT_ID', ''),
      storageBucket: this.getVar('VITE_FIREBASE_STORAGE_BUCKET', ''),
      messagingSenderId: this.getVar('VITE_FIREBASE_MESSAGING_SENDER_ID', ''),
      appId: this.getVar('VITE_FIREBASE_APP_ID', ''),
      measurementId: this.getVar('VITE_FIREBASE_MEASUREMENT_ID', ''),
    };
  }
}
