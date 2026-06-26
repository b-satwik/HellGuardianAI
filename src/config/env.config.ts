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

  public static get geminiApiKey(): string {
    // Falls back to prompt's provided testing key if not set
    return this.getVar('VITE_GEMINI_API_KEY', 'AQ.Ab8RN6JvTQ5dafKSjZdoTC3y7enbQDnnb7x0Uw6cqwzTIu6YFw');
  }

  public static get oauth(): OAuthConfig {
    return {
      clientId: this.getVar('VITE_OAUTH_CLIENT_ID', '830122444956-uik6bdjkrei0ab9utk1cs83a9kdoac4i.apps.googleusercontent.com'),
      clientSecret: this.getVar('VITE_OAUTH_CLIENT_SECRET', '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'),
    };
  }

  public static get firebase(): FirebaseConfig {
    return {
      apiKey: this.getVar('VITE_FIREBASE_API_KEY', 'AIzaSyAOgXMvisMUtxU_te9IitEPQq2E2r7cg4E'),
      authDomain: this.getVar('VITE_FIREBASE_AUTH_DOMAIN', 'hellguardianai-9cf98.firebaseapp.com'),
      projectId: this.getVar('VITE_FIREBASE_PROJECT_ID', 'hellguardianai-9cf98'),
      storageBucket: this.getVar('VITE_FIREBASE_STORAGE_BUCKET', 'hellguardianai-9cf98.firebasestorage.app'),
      messagingSenderId: this.getVar('VITE_FIREBASE_MESSAGING_SENDER_ID', '203840912502'),
      appId: this.getVar('VITE_FIREBASE_APP_ID', '1:203840912502:web:2aaca464fff62b76187357'),
      measurementId: this.getVar('VITE_FIREBASE_MEASUREMENT_ID', 'G-W0HQVYSQQ3'),
    };
  }
}
