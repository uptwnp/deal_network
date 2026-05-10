import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lcfhvhhexidtbzcxwryx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZmh2aGhleGlkdGJ6Y3h3cnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQ2MjAsImV4cCI6MjA4ODc1MDYyMH0.N7YbFODZhzPQ2Rgtqp760JUmGlw010dFxRwm1MYCvVo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('network_users')
    .insert({
      name: 'Test',
      phone: '1234567890',
      pin: '1234'
    });
    
  console.log("Insert Data:", data);
  console.log("Insert Error:", error);
}

test();
