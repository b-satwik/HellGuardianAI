import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  linkWithPopup,
  browserLocalPersistence,
  setPersistence,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  googleToken: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Set default session persistence (local storage session persistence)
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error('Persistence configuration failed:', err);
    });
  }, []);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // Attempt to load Google Access Token from localStorage if user is authenticated
      if (currentUser) {
        const storedToken = localStorage.getItem(`google_token_${currentUser.uid}`);
        setGoogleToken(storedToken || null);
      } else {
        setGoogleToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken && result.user) {
        setGoogleToken(credential.accessToken);
        localStorage.setItem(`google_token_${result.user.uid}`, credential.accessToken);
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Email login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      // Set display name
      if (result.user) {
        await updateProfile(result.user, { displayName: name });
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset email failed:', error);
      throw error;
    }
  };

  const sendVerification = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (error) {
        console.error('Verification email failed:', error);
        throw error;
      }
    }
  };

  const linkGoogleAccount = async () => {
    if (!auth.currentUser) throw new Error('NO ACTIVE SESSION');
    setLoading(true);
    try {
      const result = await linkWithPopup(auth.currentUser, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleToken(credential.accessToken);
        localStorage.setItem(`google_token_${auth.currentUser.uid}`, credential.accessToken);
      }
    } catch (error) {
      console.error('Google linking failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setGoogleToken(null);
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
      console.log('User signed out, application storage reset.');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      googleToken, 
      loading, 
      loginWithGoogle, 
      loginWithEmail,
      registerWithEmail,
      resetPassword,
      sendVerification,
      linkGoogleAccount,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
