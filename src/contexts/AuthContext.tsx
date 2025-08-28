import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, testSupabaseConnection } from '../lib/supabase'
import type { UserProfile } from '../types'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  authInitialized: boolean // New state to indicate if auth has been initialized
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authInitialized, setAuthInitialized] = useState(false) // Initialize to false

  // Initialize auth
  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        console.log('🔄 Setting up auth state listener')
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log('🔄 Auth state change event:', event, currentSession)
            if (!mounted) return

            setSession(currentSession)
            setUser(currentSession?.user || null)

            if (currentSession?.user) {
              // Profile will be loaded by the separate useEffect
            } else {
              setProfile(null)
            }

            // Only set loading to false and initialized to true after the first event
            if (loading) {
              setLoading(false)
            }
            if (!authInitialized) {
              setAuthInitialized(true)
            }
          }
        )
        // Cleanup subscription on unmount
        return () => {
          mounted = false
          subscription.unsubscribe()
          console.log('🛑 Auth listener cleanup')
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
          setAuthInitialized(true) // Ensure it's set to true even on error
        }
      }
    }

    initializeAuth()
  }, [])

  // Effect to load user profile when user changes
  useEffect(() => {
    let mounted = true
    if (user) {
      loadUserProfile(user.id)
    } else {
      setProfile(null)
    }
    return () => { mounted = false }
  }, [user])

  async function loadUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user profile:', error)
        return
      }
      
      setProfile(data)
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      // Update state directly for immediate UI feedback
      if (result.data.user && result.data.session) { setUser(result.data.user); setSession(result.data.session); }
      return { error: result.error }
    } catch (error) {
      return { error }
    }
  }

  async function signUp(email: string, password: string) {
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.protocol}//${window.location.host}/auth/callback`
        }
      })
      // Update state directly for immediate UI feedback
      if (result.data.user && result.data.session) { setUser(result.data.user); setSession(result.data.session); }
      return { error: result.error }
    } catch (error) {
      return { error }
    }
  }

  async function signOut() {
    try {
      const result = await supabase.auth.signOut()
      // Limpiar estado local
      setUser(null)
      setProfile(null)
      setSession(null)
      return { error: result.error }
    } catch (error) {
      return { error }
    }
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        authInitialized,
        signIn,
        signUp,
        signOut,
        isAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}