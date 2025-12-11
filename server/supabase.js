const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://uijzbjnenqkeqdpnbsct.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpanpiam5lbnFrZXFkcG5ic2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODc3NDcsImV4cCI6MjA4MDk2Mzc0N30.4IYvw9yDxrjb-eg2TKNpcUTc5zrsCUJmznWzVEvTI2I';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = { supabase };
