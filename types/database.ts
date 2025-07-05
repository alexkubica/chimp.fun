export interface Database {
  public: {
    Tables: {
      editor_activities: {
        Row: {
          id: string
          user_wallet: string | null
          session_id: string
          activity_type: 'generation' | 'download' | 'copy' | 'share'
          nft_collection: string | null
          nft_token_id: string | null
          nft_image_url: string | null
          reaction_type: string | null
          output_type: 'gif' | 'mp4' | 'image'
          output_url: string | null
          metadata: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_wallet?: string | null
          session_id: string
          activity_type: 'generation' | 'download' | 'copy' | 'share'
          nft_collection?: string | null
          nft_token_id?: string | null
          nft_image_url?: string | null
          reaction_type?: string | null
          output_type: 'gif' | 'mp4' | 'image'
          output_url?: string | null
          metadata?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_wallet?: string | null
          session_id?: string
          activity_type?: 'generation' | 'download' | 'copy' | 'share'
          nft_collection?: string | null
          nft_token_id?: string | null
          nft_image_url?: string | null
          reaction_type?: string | null
          output_type?: 'gif' | 'mp4' | 'image'
          output_url?: string | null
          metadata?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      activity_type: 'generation' | 'download' | 'copy' | 'share'
      output_type: 'gif' | 'mp4' | 'image'
    }
  }
}

export type EditorActivity = Database['public']['Tables']['editor_activities']['Row']
export type EditorActivityInsert = Database['public']['Tables']['editor_activities']['Insert']
export type EditorActivityUpdate = Database['public']['Tables']['editor_activities']['Update']