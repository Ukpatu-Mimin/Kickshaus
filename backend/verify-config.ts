import { config, isSupabaseConfigured } from './src/config/env';

console.log('Supabase URL:', config.supabase.url);
console.log('Supabase Anon Key:', config.supabase.anonKey ? 'Present (starts with ' + config.supabase.anonKey.substring(0, 5) + '...)' : 'Missing');
console.log('Supabase Service Role Key:', config.supabase.serviceRoleKey ? 'Present (starts with ' + config.supabase.serviceRoleKey.substring(0, 5) + '...)' : 'Missing');
console.log('Is Supabase Configured:', isSupabaseConfigured());
