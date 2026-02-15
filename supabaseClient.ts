import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://zxkdotzhaclwbwimpcnk.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_vWFqxiIH-8nTD8Y3W8AytQ_sOUNCwNh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);