import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://soiuimhkenxacipsruzr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvaXVpbWhrZW54YWNpcHNydXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzQwNDIsImV4cCI6MjA5NzIxMDA0Mn0.mmMdPTOhZAv2fplExu7k1UfxThUEr-QOWp--xZg2tF4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);