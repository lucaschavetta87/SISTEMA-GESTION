import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mshzaatzxjzzqruszihp.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_9w01GiT57R-vruEgbVkQEQ_z4UShVc6';

// ESTA LÍNEA ES LA CLAVE: Debe decir "export const supabase"
export const supabase = createClient(supabaseUrl, supabaseAnonKey);