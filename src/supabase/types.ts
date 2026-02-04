type SupabaseTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: Array<{
    foreignKeyName: string;
    columns: string[];
    isOneToOne?: boolean;
    referencedRelation: string;
    referencedColumns: string[];
  }>;
};

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          timezone?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          role: "owner" | "instructor";
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          role: "owner" | "instructor";
          display_name: string;
          created_at?: string;
        };
        Update: {
          organization_id?: string;
          role?: "owner" | "instructor";
          display_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      organization_settings: {
        Row: {
          organization_id: string;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          logo_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      [key: string]: SupabaseTable;
    };
    Views: Record<string, never>;
    Functions: {
      create_organization_for_owner: {
        Args: {
          organization_name: string;
          owner_display_name: string;
        };
        Returns: string;
      };
      [key: string]: {
        Args: Record<string, unknown> | never;
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
