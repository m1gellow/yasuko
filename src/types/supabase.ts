export interface Database {
  public: {
    Tables: {
      character: {
        Row: {
          id: string;
          name: string;
          created_at: string | null;
          rating: number | null;
          satiety: number | null;
          mood: number | null;
          life_power: number | null;
          last_interaction: string | null;
        };
        Insert: {
          id?: string;
          name?: string;
          created_at?: string | null;
          rating?: number | null;
          satiety?: number | null;
          mood?: number | null;
          life_power?: number | null;
          last_interaction?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string | null;
          rating?: number | null;
          satiety?: number | null;
          mood?: number | null;
          life_power?: number | null;
          last_interaction?: string | null;
        };
      };
      levels: {
        Row: {
          id: string;
          min_rating: number;
          max_rating: number;
          title: string;
          description: string | null;
          reward: Record<string, any> | null;
        };
        Insert: {
          id?: string;
          min_rating: number;
          max_rating: number;
          title: string;
          description?: string | null;
          reward?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          min_rating?: number;
          max_rating?: number;
          title?: string;
          description?: string | null;
          reward?: Record<string, any> | null;
        };
      };
      messages: {
        Row: {
          id: string;
          channel_id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_sticker: boolean;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_sticker?: boolean;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          sender_id?: string;
          receiver_id?: string;
          content?: string;
          is_sticker?: boolean;
          is_read?: boolean;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          is_read: boolean;
          data: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          is_read?: boolean;
          data?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          is_read?: boolean;
          data?: Record<string, any>;
          created_at?: string;
        };
      };
      phrases: {
        Row: {
          id: string;
          category: string | null;
          text: string;
        };
        Insert: {
          id?: string;
          category?: string | null;
          text: string;
        };
        Update: {
          id?: string;
          category?: string | null;
          text?: string;
        };
      };
      promo_codes: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          condition: string;
          timer: unknown;
          created_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          condition: string;
          timer: unknown;
          created_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          condition?: string;
          timer?: unknown;
          created_at?: string | null;
          expires_at?: string | null;
        };
      };
      referral_links: {
        Row: {
          id: string;
          user_id: string;
          code: string;
          created_at: string;
          expires_at: string | null;
          max_uses: number | null;
          use_count: number;
          is_active: boolean;
          reward: {
            coins?: number;
            energy?: number;
          };
        };
        Insert: {
          id?: string;
          user_id: string;
          code: string;
          created_at?: string;
          expires_at?: string | null;
          max_uses?: number | null;
          use_count?: number;
          is_active?: boolean;
          reward?: {
            coins?: number;
            energy?: number;
          };
        };
        Update: {
          id?: string;
          user_id?: string;
          code?: string;
          created_at?: string;
          expires_at?: string | null;
          max_uses?: number | null;
          use_count?: number;
          is_active?: boolean;
          reward?: {
            coins?: number;
            energy?: number;
          };
        };
      };
      referral_uses: {
        Row: {
          id: string;
          referral_id: string;
          user_id: string;
          created_at: string;
          ip_address: string | null;
          reward_claimed: boolean;
        };
        Insert: {
          id?: string;
          referral_id: string;
          user_id: string;
          created_at?: string;
          ip_address?: string | null;
          reward_claimed?: boolean;
        };
        Update: {
          id?: string;
          referral_id?: string;
          user_id?: string;
          created_at?: string;
          ip_address?: string | null;
          reward_claimed?: boolean;
        };
      };
      user_promo_codes: {
        Row: {
          id: string;
          user_id: string | null;
          promo_id: string | null;
          issued_at: string | null;
          expires_at: string | null;
          is_active: boolean | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          promo_id?: string | null;
          issued_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          promo_id?: string | null;
          issued_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean | null;
        };
      };
      user_stats: {
        Row: {
          id: string;
          user_id: string | null;
          action: string | null;
          timestamp: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action?: string | null;
          timestamp?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string | null;
          timestamp?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email?: string | null;
          password_hash: string;
          created_at: string | null;
          last_login: string | null;
          total_clicks: number | null;
          feed_clicks: number | null;
          pet_clicks: number | null;
          promo_codes_used: Record<string, any> | null;
          avatar_url?: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          password_hash: string;
          created_at?: string | null;
          last_login?: string | null;
          total_clicks?: number | null;
          feed_clicks?: number | null;
          pet_clicks?: number | null;
          promo_codes_used?: Record<string, any> | null;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          password_hash?: string;
          created_at?: string | null;
          last_login?: string | null;
          total_clicks?: number | null;
          feed_clicks?: number | null;
          pet_clicks?: number | null;
          promo_codes_used?: Record<string, any> | null;
          avatar_url?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_user_record: {
        Args: {
          user_id: string;
          user_email: string;
          user_name: string;
          user_phone?: string;
        };
        Returns: boolean;
      };
      generate_referral_code: {
        Args: {
          length?: number;
        };
        Returns: string;
      };
      get_user_rank: {
        Args: {
          user_id: string;
        };
        Returns: number;
      };
      send_system_notification: {
        Args: {
          p_user_id: string;
          p_title: string;
          p_message: string;
          p_type?: string;
          p_data?: Record<string, any>;
        };
        Returns: string;
      };
      use_referral_code: {
        Args: {
          p_code: string;
          p_user_id: string;
          p_ip_address?: string;
        };
        Returns: {
          success: boolean;
          message: string;
          reward?: {
            coins?: number;
            energy?: number;
          };
          referrer_id?: string;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Типы данных из базы
export type Tables = Database['public']['Tables'];
export type User = Tables['users']['Row'];
export type Character = Tables['character']['Row'];
export type Level = Tables['levels']['Row'];
export type Phrase = Tables['phrases']['Row'];
export type PromoCode = Tables['promo_codes']['Row'];
export type UserPromoCode = Tables['user_promo_codes']['Row'];
export type UserStat = Tables['user_stats']['Row'];
export type Message = Tables['messages']['Row'];
export type Notification = Tables['notifications']['Row'];