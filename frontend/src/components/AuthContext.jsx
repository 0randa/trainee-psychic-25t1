'use client';

import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setAuth({ isAuthenticated: false, user: null, loading: false });
      return;
    }

    // Fetch name from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', session.user.id)
      .single();

    setAuth({
      isAuthenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: profile?.name,
      },
      loading: false,
    });
  };

  useEffect(() => {
    checkAuthStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuthStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ auth, setAuth, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
};
