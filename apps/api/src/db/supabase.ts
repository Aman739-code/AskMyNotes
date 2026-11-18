import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../lib/logger/index.js';

const logger = createLogger('supabase');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseServiceKey !== 'your-service-role-key',
);

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  : (null as unknown as SupabaseClient);

if (!isSupabaseConfigured) {
  logger.info('Supabase credentials not configured in environment; running with local in-memory DB layer');
}
