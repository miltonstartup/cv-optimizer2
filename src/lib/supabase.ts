import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'supabase.auth.token'
  },
  global: {
    headers: {
      'X-Client-Info': 'cv-optimizer@1.0.0'
    }
  }
})

// Función para verificar la conexión
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1)
    if (error) throw error
    console.log('✅ Supabase connection successful')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return false
  }
}

// Helper functions for CV operations
export const cvOperations = {
  async parseCV(cvId: string, linkedinUrl?: string, fileContent?: string) {
    try {
    const { data, error } = await supabase.functions.invoke('parse-cv', {
      body: { cvId, linkedinUrl, fileContent },
    })
    return { data, error }
    } catch (error) {
      console.error('Error in parseCV:', error)
      return { data: null, error }
    }
  },

  async parseListing(listingId?: string, content?: string, fileContent?: string) {
    try {
    const { data, error } = await supabase.functions.invoke('parse-listing', {
      body: { listingId, content, fileContent },
    })
    return { data, error }
    } catch (error) {
      console.error('Error in parseListing:', error)
      return { data: null, error }
    }
  },

  async parseLinkedInScreenshot(imageData: string, cvId?: string, fileName?: string) {
    try {
    const { data, error } = await supabase.functions.invoke('parse-linkedin-screenshot', {
      body: { imageData, cvId, fileName },
    })
    return { data, error }
    } catch (error) {
      console.error('Error in parseLinkedInScreenshot:', error)
      return { data: null, error }
    }
  },

  async analyzeCV(cvId: string, listingId?: string) {
    try {
    const { data, error } = await supabase.functions.invoke('analyze-cv', {
      body: { cvId, listingId },
    })
    return { data, error }
    } catch (error) {
      console.error('Error in analyzeCV:', error)
      return { data: null, error }
    }
  },

  async recommendCV(cvId: string, analysisId?: string, listingId?: string) {
    try {
    const { data, error } = await supabase.functions.invoke('recommend-cv', {
      body: { cvId, analysisId, listingId },
    })
    return { data, error }
    } catch (error) {
      console.error('Error in recommendCV:', error)
      return { data: null, error }
    }
  },

  async generateSummary(cvId: string, listingId?: string, profileData?: any) {
    try {
    const { data, error } = await supabase.functions.invoke('generate-summary', {
      body: { cvId, listingId, profileData },
    })
    return { data, error }
    } catch (error) {
      console.error('Error in generateSummary:', error)
      return { data: null, error }
    }
  }
}