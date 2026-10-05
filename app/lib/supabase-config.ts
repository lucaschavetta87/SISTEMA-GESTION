// Configuración pública de Supabase (URL + publishable/anon key).
// Estos valores viajan al navegador en cualquier caso: son públicos por diseño.
// Se leen del entorno si existe y, si no, se usa la del proyecto, así el build
// nunca falla por falta de variables (p. ej. en Vercel, donde .env* está en .gitignore).

const SUPABASE_URL_POR_DEFECTO = 'https://mshzaatzxjzzqruszihp.supabase.co';
const SUPABASE_KEY_POR_DEFECTO = 'sb_publishable_9w01GiT57R-vruEgbVkQEQ_z4UShVc6';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL_POR_DEFECTO;

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  SUPABASE_KEY_POR_DEFECTO;

export function faltanCredenciales(): boolean {
  return !SUPABASE_URL || !SUPABASE_ANON_KEY;
}

export function errorFaltanCredenciales(): Error {
  return new Error(
    'Supabase sin configurar: definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
      '(.env.local en local, Settings → Environment Variables en Vercel).'
  );
}
