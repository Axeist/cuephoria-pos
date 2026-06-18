import { createClient } from '@supabase/supabase-js';

// This script fixes VR station pricing from ₹600 to ₹150
// VR stations have 15-minute sessions at ₹150, not ₹600

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixVRPricing() {
  console.log('🔍 Checking VR stations with incorrect pricing...');
  
  // First, check what VR stations exist
  const { data: vrStations, error: fetchError } = await supabase
    .from('stations')
    .select('id, name, type, hourly_rate')
    .eq('type', 'vr');
  
  if (fetchError) {
    console.error('❌ Error fetching VR stations:', fetchError);
    return;
  }
  
  console.log(`Found ${vrStations?.length || 0} VR station(s):`);
  vrStations?.forEach(station => {
    console.log(`  - ${station.name}: ₹${station.hourly_rate}`);
  });
  
  // Update VR stations that have hourly_rate = 600 to 150
  const { data: updated, error: updateError } = await supabase
    .from('stations')
    .update({ hourly_rate: 150 })
    .eq('type', 'vr')
    .eq('hourly_rate', 600)
    .select();
  
  if (updateError) {
    console.error('❌ Error updating VR stations:', updateError);
    return;
  }
  
  if (updated && updated.length > 0) {
    console.log(`✅ Successfully updated ${updated.length} VR station(s) to ₹150 for 15 minutes`);
    updated.forEach(station => {
      console.log(`  - ${station.name}: ₹${station.hourly_rate}`);
    });
  } else {
    console.log('ℹ️  No VR stations needed updating (already at correct price)');
  }
  
  // Verify final state
  const { data: finalStations } = await supabase
    .from('stations')
    .select('id, name, type, hourly_rate')
    .eq('type', 'vr');
  
  console.log('\n📊 Final VR station pricing:');
  finalStations?.forEach(station => {
    console.log(`  - ${station.name}: ₹${station.hourly_rate} per 15 minutes`);
  });
}

fixVRPricing()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
