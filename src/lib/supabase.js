// Supabase клиент. .env.local (эсвэл Vercel → Environment Variables)-д
// VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY байвал Supabase горимоор ажиллана,
// байхгүй бол өгөгдлийг браузерт хадгалдаг демо горимоор ажиллана.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isRemote = Boolean(url && key);
export const supabase = isRemote ? createClient(url, key) : null;
