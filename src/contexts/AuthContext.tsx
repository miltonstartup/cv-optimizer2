import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, testSupabaseConnection } from '../lib/supabase'
import type { UserProfile } from '../types'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
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

  // Initialize auth
  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        console.log('🔄 Initializing authentication...')
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting initial session:', error)
        }
        
        if (mounted) {
          setSession(session)
          setUser(session?.user || null)
          
          // Load profile if user exists
          if (session?.user) {
            await loadUserProfile(session.user.id)
          } else {
            setProfile(null)
          }
          
          setLoading(false)
          
          console.log('✅ Auth initialized successfully', {
            hasUser: !!session?.user,
            userId: session?.user?.id
          })
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [])

  // Set up auth state change listener
  useEffect(() => {
    let mounted = true
    console.log('🔄 Setting up auth state listener')

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change event:', event)
        
        if (!mounted) return
        
        try {
          setSession(session)
          setUser(session?.user || null)
          
          if (session?.user) {
            await loadUserProfile(session.user.id)
          } else {
            setProfile(null)
          }
          
        } catch (error) {
          console.error('❌ Error handling auth state change:', error)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
      console.log('🛑 Auth listener cleanup')
    }
  }, [])

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