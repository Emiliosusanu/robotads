import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avwdomeilpwbsaknbgmo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2d2RvbWVpbHB3YnNha25iZ21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5Nzk4NTAsImV4cCI6MjA2NDU1NTg1MH0.bEnNB6OlTYpWBoguJF1ey4xhVNmjlaJYBv6X3Hu_eMQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);