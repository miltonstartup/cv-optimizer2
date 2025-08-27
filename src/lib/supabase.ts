import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://imrulmegjjmevgoslnjg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltcnVsbWVnamptZXZnb3NsbmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjg5NTYsImV4cCI6MjA3MTc0NDk1Nn0.0un_5rI2s6tkJBZguCO---8JyuhaVB7LBdy-MYf5TrU'

// Verificar que las variables estén definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing!')
  throw new Error('Supabase URL or Anon Key is missing')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'supabase.auth.token'
  }
})

// Helper functions for CV operations
export const cvOperations = {
  async parseCV(cvId: string, linkedinUrl?: string, fileContent?: string) {
    const { data, error } = await supabase.functions.invoke('parse-cv', {
      body: { cvId, linkedinUrl, fileContent },
    })
    return { data, error }
  },

  async parseListing(listingId?: string, content?: string, fileContent?: string) {
    const { data, error } = await supabase.functions.invoke('parse-listing', {
      body: { listingId, content, fileContent },
    })
    return { data, error }
  },

  async parseLinkedInScreenshot(imageData: string, cvId?: string, fileName?: string) {
    const { data, error } = await supabase.functions.invoke('parse-linkedin-screenshot', {
      body: { imageData, cvId, fileName },
    })
    return { data, error }
  },

  async analyzeCV(cvId: string, listingId?: string) {
    const { data, error } = await supabase.functions.invoke('analyze-cv', {
      body: { cvId, listingId },
    })
    return { data, error }
  },

  async recommendCV(cvId: string, analysisId?: string, listingId?: string) {
    const { data, error } = await supabase.functions.invoke('recommend-cv', {
      body: { cvId, analysisId, listingId },
    })
    return { data, error }
  },

  async generateSummary(cvId: string, listingId?: string, profileData?: any) {
    const { data, error } = await supabase.functions.invoke('generate-summary', {
      body: { cvId, listingId, profileData },
    })
    return { data, error }
  }
}