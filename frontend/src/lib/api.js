import axios from 'axios';
import { supabase } from './supabase';

export async function apiRequest(method, path, data) {
  const { data: { session } } = await supabase.auth.getSession();
  return axios({
    method,
    url: `${process.env.NEXT_PUBLIC_API_URL}${path}`,
    data,
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
    },
  });
}
