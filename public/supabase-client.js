// --- Supabase Setup ---
const SUPABASE_URL = 'https://ozpduwxtxtcirxcixrhd.supabase.co'; // Find this in your Supabase project settings > API
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96cGR1d3h0eHRjaXJ4Y2l4cmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDk2NzgsImV4cCI6MjA2OTg4NTY3OH0.iSDnVd4WGV_H5OQfBkVNp5uxy-zynoE3UlEawakWaII'; // Find this in your Supabase project settings > API

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// --- End of Supabase Setup ---
