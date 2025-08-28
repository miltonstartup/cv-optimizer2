// Utilidades para operaciones con Supabase
import { supabase } from '../lib/supabase'
import { SUPABASE_CONFIG, ERROR_MESSAGES } from './constants'
import type { CVData, JobListing, Analysis, UserProfile } from '../types'

// Función para reintentar operaciones de Supabase
export async function retrySupabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = SUPABASE_CONFIG.MAX_RETRIES
): Promise<T> {
  let lastError: any
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      console.warn(`Intento ${attempt}/${maxRetries} falló:`, error)
      
      if (attempt < maxRetries) {
        await new Promise(resolve => 
          setTimeout(resolve, SUPABASE_CONFIG.RETRY_DELAY * attempt)
        )
      }
    }
  }
  
  throw lastError
}

// Operaciones CRUD para CVs
export const cvDatabase = {
  async create(cvData: Omit<CVData, 'id' | 'created_at'>): Promise<CVData> {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase
        .from('cvs')
        .insert(cvData)
        .select()
        .single()
      
      if (error) throw error
      return data
    })
  },

  async getById(id: string, userId: string): Promise<CVData | null> {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase
        .from('cvs')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle()
      
      if (error) throw error
      return data
    })
  },

  async getByUserId(userId: string): Promise<CVData[]> {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase
        .from('cvs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    })
  },

  async update(id: string, updates: Partial<CVData>): Promise<CVData> {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase
        .from('cvs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    })
  },

  async delete(id: string, userId: string): Promise<void> {
    return retrySupabaseOperation(async () => {
      const { error } = await supabase
        .from('cvs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
      
      if (error) throw error
    })
  }
}

// Operaciones para análisis
export const analysisDatabase = {
  async create(analysisData: Omit<Analysis, 'created_at'>): Promise<Analysis> {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase
        .from('analyses')
        .insert(analysisData)
        .select()
        .single()
      
      if (error) throw error
      return data
    })
  },

  async getByCvId(cvId: string): Promise<Analysis[]> {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('cv_id', cvId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    })
  }
}

// Operaciones para job listings
export const listingDatabase = {
  async create(listingData: Omit<JobListing, 'id' | 'created_at'>): Promise<JobListing> {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase
        .from('listings')
        .insert(listingData)
        .select()
        .single()
      
      if (error) throw error
      return data
    })
  },

  async getByCvId(cvId: string): Promise<JobListing[]> {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('cv_id', cvId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    })
  }
}

// Función para manejar errores de Supabase
export function handleSupabaseError(error: any): string {
  if (!error) return ERROR_MESSAGES.SUPABASE_ERROR
  
  // Errores de red
  if (error.message?.includes('fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR
  }
  
  // Errores de autenticación
  if (error.message?.includes('JWT') || error.message?.includes('auth')) {
    return ERROR_MESSAGES.AUTH_ERROR
  }
  
  // Errores específicos de Supabase
  if (error.code) {
    switch (error.code) {
      case 'PGRST116':
        return 'Recurso no encontrado'
      case '23505':
        return 'Ya existe un registro con estos datos'
      case '42501':
        return 'No tienes permisos para realizar esta acción'
      default:
        return error.message || ERROR_MESSAGES.SUPABASE_ERROR
    }
  }
  
  return error.message || ERROR_MESSAGES.SUPABASE_ERROR
}