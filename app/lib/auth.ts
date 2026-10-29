import { supabase } from '../supabase';
import { sha256Hex } from './sha256';

// ===================== Tipos =====================

export type Rol = 'admin' | 'usuario';

export interface Sesion {
  id: number;
  usuario: string;
  nombre: string;
  rol: Rol;
  sucursal: { id: number; nombre: string };
  modulos: string[];
}

export interface ModuloDef {
  id: string;
  etiqueta: string;
  icono: string;
  soloAdmin?: boolean;
}

// ===================== Catálogo de módulos =====================

export const MODULOS: ModuloDef[] = [
  { id: 'inicio', etiqueta: 'Inicio', icono: '🏠' },
  { id: 'servicio', etiqueta: 'Ingreso Equipo', icono: '🛠️' },
  { id: 'ordenes', etiqueta: 'Ordenes Taller', icono: '📋' },
  { id: 'ventas', etiqueta: 'Punto de Venta', icono: '💰' },
  { id: 'stock', etiqueta: 'Inventario (Stock)', icono: '📦' },
  { id: 'caja', etiqueta: 'Caja y Cierres', icono: '💵' },
  { id: 'presupuestos', etiqueta: 'Presupuestos', icono: '📄' },
  { id: 'clientes', etiqueta: 'Cuenta Corriente', icono: '💳' },
  { id: 'facturacion', etiqueta: 'Facturación ARCA', icono: '🚀' },
  { id: 'usuarios', etiqueta: 'Gestión de Usuarios', icono: '👥', soloAdmin: true },
];

export const TODOS_MODULOS = MODULOS.filter((m) => !m.soloAdmin).map((m) => m.id);

// ===================== Passwords =====================

const CLAVE_SESION = 'confix_sesion';

function generarSalt(): string {
  let salt = '';
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(8);
    cryptoObj.getRandomValues(bytes);
    for (const b of bytes) salt += b.toString(16).padStart(2, '0');
  } else {
    for (let i = 0; i < 16; i++) salt += Math.floor(Math.random() * 16).toString(16);
  }
  return salt;
}

/** Formato guardado en la base: "salt$hash" */
export function hashearPassword(password: string, salt?: string): string {
  const s = salt ?? generarSalt();
  return `${s}$${sha256Hex(s + password)}`;
}

export function verificarPassword(password: string, almacenado: string): boolean {
  const [salt, hash] = String(almacenado || '').split('$');
  if (!salt || !hash) return false;
  return sha256Hex(salt + password) === hash;
}

// ===================== Sesión =====================

export function obtenerSesion(): Sesion | null {
  if (typeof window === 'undefined') return null;
  try {
    const crudo = window.localStorage.getItem(CLAVE_SESION);
    if (!crudo) return null;
    const s = JSON.parse(crudo) as Sesion;
    return s && s.id ? s : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion: Sesion): void {
  try {
    window.localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function cerrarSesion(): void {
  try {
    window.localStorage.removeItem(CLAVE_SESION);
  } catch {
    /* almacenamiento no disponible */
  }
}

export function tieneModulo(sesion: Sesion | null, modulo: string): boolean {
  if (!sesion) return false;
  if (sesion.rol === 'admin') return true;
  return Array.isArray(sesion.modulos) && sesion.modulos.includes(modulo);
}

export function esAdmin(sesion: Sesion | null): boolean {
  return sesion?.rol === 'admin';
}

// ===================== Login =====================

interface FilaUsuario {
  id: number;
  usuario: string;
  nombre: string;
  password_hash: string;
  rol: Rol;
  activo: boolean;
  modulos: string[] | null;
  sucursal_id: number | null;
  sucursales?: { id: number; nombre: string } | { id: number; nombre: string }[] | null;
}

export async function iniciarSesion(
  usuario: string,
  password: string
): Promise<{ ok: boolean; error?: string; sesion?: Sesion }> {
  const usuarioLimpio = usuario.trim();
  if (!usuarioLimpio) return { ok: false, error: 'Ingresá el usuario.' };
  if (!password) return { ok: false, error: 'Ingresá la contraseña.' };

  const { data, error } = await supabase
    .from('usuarios')
    .select(
      'id, usuario, nombre, password_hash, rol, activo, modulos, sucursal_id, sucursales(id, nombre)'
    )
    .eq('usuario', usuarioLimpio)
    .maybeSingle();

  if (error) return { ok: false, error: 'No se pudo conectar con la base de datos.' };

  const fila = data as unknown as FilaUsuario | null;
  if (!fila) return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  if (!verificarPassword(password, fila.password_hash))
    return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  if (!fila.activo) return { ok: false, error: 'Este usuario está desactivado. Hablá con el administrador.' };

  const sucursalEmbebida = Array.isArray(fila.sucursales) ? fila.sucursales[0] : fila.sucursales;
  const sucursal = sucursalEmbebida
    ? { id: sucursalEmbebida.id, nombre: sucursalEmbebida.nombre }
    : { id: 0, nombre: 'Sin sucursal' };

  const sesion: Sesion = {
    id: fila.id,
    usuario: fila.usuario,
    nombre: fila.nombre || fila.usuario,
    rol: fila.rol,
    sucursal,
    modulos: fila.modulos ?? [],
  };

  guardarSesion(sesion);
  return { ok: true, sesion };
}
