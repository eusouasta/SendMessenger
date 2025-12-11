import { createClient } from '@supabase/supabase-js';

// Admin Dashboard uses the same project credentials
// In a real production app, you might want to force the user to input the key
// or use a Service Role key server-side. For this dashboard, we use the client key
// and rely on RLS (or if we need admin powers, we might need a key input UI).

const SUPABASE_URL = 'https://uijzbjnenqkeqdpnbsct.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpanpiam5lbnFrZXFkcG5ic2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODc3NDcsImV4cCI6MjA4MDk2Mzc0N30.4IYvw9yDxrjb-eg2TKNpcUTc5zrsCUJmznWzVEvTI2I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
