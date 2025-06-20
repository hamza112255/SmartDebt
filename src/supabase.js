import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://luovxmspvxafbckbtkck.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1b3Z4bXNwdnhhZmJja2J0a2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjYxNjAsImV4cCI6MjA2NTkwMjE2MH0.qvNmONh5i7iMaNdLBmyrGTBlfgfqpmSUY8GX5XnCSoY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    redirectTo: 'myapp://auth/callback', // As requested by the user
  },
});
