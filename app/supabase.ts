import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, faltanCredenciales, errorFaltanCredenciales } from './lib/supabase-config';

let cliente: SupabaseClient | null = null;

function obtenerCliente(): SupabaseClient {
  if (faltanCredenciales()) throw errorFaltanCredenciales();
  if (!cliente) cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cliente;
}

// Cliente perezoso: se crea recién al primer uso. Así `next build` puede
// generar (y exportar) la página sin tocar Supabase y sin romperse si el
// entorno no tiene las variables (evita "supabaseKey is required." en Vercel).
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_objetivo, propiedad) {
    const instancia = obtenerCliente() as unknown as Record<PropertyKey, unknown>;
    const valor = instancia[propiedad];
    return typeof valor === 'function' ? valor.bind(instancia) : valor;
  },
  has(_objetivo, propiedad) {
    return propiedad in (obtenerCliente() as unknown as object);
  },
});
