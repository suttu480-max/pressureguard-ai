import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check stored auth
    const stored = JSON.parse(localStorage.getItem('pressureguard_auth') || 'null');
    if (stored) {
      setUser(stored);
      setProfile({
        id: stored.user_id,
        email: stored.email,
        full_name: stored.full_name,
        role: stored.role
      });
    }
    setLoading(false);
  }, []);

  const login = (authData) => {
    localStorage.setItem('pressureguard_auth', JSON.stringify(authData));
    setUser(authData);
    setProfile({
      id: authData.user_id,
      email: authData.email,
      full_name: authData.full_name,
      role: authData.role
    });
  };

  const logout = () => {
    localStorage.removeItem('pressureguard_auth');
    setUser(null);
    setProfile(null);
    supabase.auth.signOut().catch(() => {});
  };

  const isDoctor = () => profile?.role === 'doctor';
  const isNurse = () => profile?.role === 'nurse';
  const isCaregiver = () => profile?.role === 'caregiver';
  const canEdit = () => profile?.role === 'doctor' || profile?.role === 'nurse';

  return (
    <AuthContext.Provider value={{
      user, profile, loading, login, logout,
      isDoctor, isNurse, isCaregiver, canEdit,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}
