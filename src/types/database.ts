export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: string
          created_at?: string
        }
      }
      cvs: {
        Row: {
          id: string
          user_id: string
          file_path: string | null
          linkedin_url: string | null
          original_content: string | null
          parsed_content: any | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_path?: string | null
          linkedin_url?: string | null
          original_content?: string | null
          parsed_content?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_path?: string | null
          linkedin_url?: string | null
          original_content?: string | null
          parsed_content?: any | null
          created_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          cv_id: string
          file_path: string | null
          content: string | null
          parsed_content: any | null
          created_at: string
        }
        Insert: {
          id?: string
          cv_id: string
          file_path?: string | null
          content?: string | null
          parsed_content?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          cv_id?: string
          file_path?: string | null
          content?: string | null
          parsed_content?: any | null
          created_at?: string
        }
      }
      analyses: {
        Row: {
          id: string
          cv_id: string
          listing_id: string | null
          result_json: any
          analysis_type: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          cv_id: string
          listing_id?: string | null
          result_json: any
          analysis_type?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          cv_id?: string
          listing_id?: string | null
          result_json?: any
          analysis_type?: string
          status?: string
          created_at?: string
        }
      }
      ai_prompts: {
        Row: {
          id: string
          prompt_type: string
          prompt_text: string
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          prompt_type: string
          prompt_text: string
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          prompt_type?: string
          prompt_text?: string
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}