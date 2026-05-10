import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const { data, error } = await supabase
    .from('network_properties')
    .select(`
      *,
      owner:network_users!inner(name, phone, firm_name),
      favorites:network_favorites(user_id, is_favourite, user_note)
    `)
    .eq('network_favorites.user_id', 3)
    .limit(2);
  console.log('Error:', error);
  console.log('Result:', JSON.stringify(data, null, 2));
}
testQuery();
