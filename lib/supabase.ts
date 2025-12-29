
import { createClient } from '@supabase/supabase-js';

/**
 * --- SUPABASE SQL SETUP SCRIPT ---
 * Copy and run the following in your Supabase SQL Editor:
 * 
 * -- 1. CLEANUP (Optional: Only if resetting)
 * -- DROP VIEW IF EXISTS dashboard_stats;
 * -- DROP TABLE IF EXISTS sessions;
 * -- DROP TABLE IF EXISTS patrons;
 * -- DROP TABLE IF EXISTS settings;
 *
 * -- 2. PATRONS TABLE
 * CREATE TABLE patrons (
 *   id TEXT PRIMARY KEY,
 *   category TEXT NOT NULL CHECK (category IN ('Student', 'Academic Staff', 'Non-Academic Staff', 'External Visitor')),
 *   first_name TEXT NOT NULL,
 *   surname TEXT NOT NULL,
 *   name TEXT GENERATED ALWAYS AS (first_name || ' ' || surname) STORED,
 *   email TEXT,
 *   phone TEXT,
 *   photo TEXT,
 *   level TEXT,
 *   program TEXT,
 *   department TEXT,
 *   ghana_card_id TEXT,
 *   total_hours FLOAT DEFAULT 0,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * CREATE INDEX idx_patrons_category ON patrons(category);
 *
 * -- 3. SESSIONS TABLE
 * CREATE TABLE sessions (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   patron_id TEXT REFERENCES patrons(id) ON DELETE CASCADE,
 *   check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   check_out TIMESTAMPTZ,
 *   duration INTEGER, -- stored in minutes
 *   notes TEXT,
 *   alert_triggered BOOLEAN DEFAULT FALSE,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * CREATE INDEX idx_sessions_patron_id ON sessions(patron_id);
 * CREATE INDEX idx_sessions_check_in ON sessions(check_in);
 * -- Partial index for active sessions (very fast for occupancy counts)
 * CREATE INDEX idx_sessions_active_only ON sessions(id) WHERE check_out IS NULL;
 *
 * -- 4. SETTINGS TABLE
 * CREATE TABLE settings (
 *   id TEXT PRIMARY KEY DEFAULT 'global_config',
 *   daily_capacity INTEGER DEFAULT 120,
 *   ai_insights_enabled BOOLEAN DEFAULT TRUE,
 *   auto_checkout_enabled BOOLEAN DEFAULT FALSE,
 *   auto_checkout_hours INTEGER DEFAULT 12,
 *   notif_enabled BOOLEAN DEFAULT TRUE,
 *   notif_email TEXT DEFAULT 'bhfnmtclibrary@gmail.com',
 *   notif_threshold_mins INTEGER DEFAULT 180,
 *   id_config JSONB DEFAULT '{"studentPrefix": "ST", "academicStaffPrefix": "AS", "nonAcademicStaffPrefix": "NAS", "visitorPrefix": "EV", "padding": 3}'::JSONB
 * );
 * INSERT INTO settings (id) VALUES ('global_config') ON CONFLICT (id) DO NOTHING;
 *
 * -- 5. DASHBOARD ANALYTICS VIEW
 * -- This view provides all the metrics for your Dashboard.tsx in one query
 * CREATE OR REPLACE VIEW dashboard_stats AS
 * SELECT 
 *   (SELECT COUNT(*) FROM patrons) as total_registered,
 *   (SELECT COUNT(*) FROM sessions WHERE check_out IS NULL) as active_patrons,
 *   (SELECT COUNT(*) FROM sessions s JOIN patrons p ON s.patron_id = p.id WHERE s.check_out IS NULL AND p.category = 'Student') as active_students,
 *   (SELECT COUNT(*) FROM sessions WHERE check_in >= CURRENT_DATE) as daily_visits,
 *   (SELECT COUNT(*) FROM sessions s JOIN patrons p ON s.patron_id = p.id WHERE s.check_in >= CURRENT_DATE AND p.category = 'Student') as student_visits,
 *   (SELECT COUNT(*) FROM sessions s JOIN patrons p ON s.patron_id = p.id WHERE s.check_in >= CURRENT_DATE AND (p.category = 'Academic Staff' OR p.category = 'Non-Academic Staff')) as staff_visits,
 *   (SELECT COUNT(*) FROM sessions s JOIN patrons p ON s.patron_id = p.id WHERE s.check_in >= CURRENT_DATE AND p.category = 'External Visitor') as visitor_visits;
 *
 * -- 6. ENABLE REAL-TIME FOR ALL ADMINS
 * -- This ensures that when one admin check-ins a student, everyone's dashboard updates
 * BEGIN;
 *   DROP PUBLICATION IF EXISTS supabase_realtime;
 *   CREATE PUBLICATION supabase_realtime FOR TABLE patrons, sessions, settings;
 * COMMIT;
 */

const supabaseUrl = 'https://bvnawmnrogumlwalvpff.supabase.co'.trim();
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bmF3bW5yb2d1bWx3YWx2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTYzOTksImV4cCI6MjA4MjQzMjM5OX0.H58X5_A0tstTujzgM7mixuJJPz9ZA-9dbT3BzlPqzAg'.trim();

export const isSupabaseConfigured = 
  supabaseUrl.length > 10 && 
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey.length > 10 &&
  supabaseAnonKey.startsWith('eyJ');

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co', 
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

export const verifyDatabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured) return { success: false, message: "Supabase configuration missing." };
  
  try {
    const { error } = await supabase.from('patrons').select('id').limit(1);
    if (error) {
      if (error.message.includes('relation "patrons" does not exist')) {
        return { success: false, message: "Schema missing. Please run the SQL setup." };
      }
      throw error;
    }
    return { success: true, message: "Cloud Database Connected" };
  } catch (err: any) {
    return { success: false, message: err.message || "Connection failed." };
  }
};
