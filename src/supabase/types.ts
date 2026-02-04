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
      students: {
        Row: {
          id: string;
          organization_id: string;
          assigned_instructor_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          license_type: "learner" | "restricted" | "full" | null;
          license_number: string | null;
          license_version: string | null;
          class_held: string | null;
          issue_date: string | null;
          expiry_date: string | null;
          notes: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          assigned_instructor_id: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          license_type?: "learner" | "restricted" | "full" | null;
          license_number?: string | null;
          license_version?: string | null;
          class_held?: string | null;
          issue_date?: string | null;
          expiry_date?: string | null;
          notes?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          assigned_instructor_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          license_type?: "learner" | "restricted" | "full" | null;
          license_number?: string | null;
          license_version?: string | null;
          class_held?: string | null;
          issue_date?: string | null;
          expiry_date?: string | null;
          notes?: string | null;
          archived_at?: string | null;
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
