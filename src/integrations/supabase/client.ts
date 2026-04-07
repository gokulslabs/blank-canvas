import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ekvcaxwziqbmiisbcxci.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_p5SppV4Cbuxp2K66lvsruQ_7rR5Ht_4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
