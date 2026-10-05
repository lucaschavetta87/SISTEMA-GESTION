import { createBrowserClient } from "@supabase/ssr";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  faltanCredenciales,
  errorFaltanCredenciales,
} from "../../supabase-config";

export const createClient = () => {
  if (faltanCredenciales()) throw errorFaltanCredenciales();
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
};
