import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        };

        getSession();

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const value = {
        signUp: (data) => supabase.auth.signUp(data),
        signIn: (data) => supabase.auth.signInWithPassword(data),
        signOut: () => supabase.auth.signOut(),
        updateUser: async (avatarUrl = null) => {
            // Force refresh the session to get updated user metadata
            const { data: { session: freshSession } } = await supabase.auth.refreshSession();
            
            if (freshSession) {
                // Merge the fresh session user with any provided avatar URL
                setUser(prev => ({
                    ...freshSession.user,
                    user_metadata: {
                        ...(freshSession.user?.user_metadata || {}),
                        ...(prev?.user_metadata || {}),
                        // Override avatar_url if provided
                        ...(avatarUrl ? { avatar_url: avatarUrl } : {})
                    }
                }));
                setSession(freshSession);
            }
        },
        user,
        session,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
