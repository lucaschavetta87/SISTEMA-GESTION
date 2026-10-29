import { supabase } from '../supabase';

// ===================== Tipos =====================

export interface Cierre {
  id: number;
  usuario_id: number | null;
  sucursal_id: number | null;
  turno: string;
  monto_inicial: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
  monto_contado: number | null;
  total_ventas: number;
  total_efectivo: number;
  total_transferencia: number;
  total_tarjeta: number;
  diferencia: number | null;
  estado: 'abierto' | 'cerrado';
  notas: string;
}

export interface Movimiento {
  id: number;
  cierre_id: number | null;
  sucursal_id: number | null;
  usuario_id: number | null;
  turno: string | null;
  tipo: 'producto' | 'servicio_tecnico' | 'seña' | 'ajuste';
  referencia_id: number | null;
  concepto: string;
  metodo_pago: string;
  monto: number;
  estado: string;
  created_at: string;
}

const n = (v: unknown): number => Number(v) || 0;

// ===================== Caja abierta =====================

export async function obtenerCierreAbierto(usuarioId: number): Promise<Cierre | null> {
  const { data, error } = await supabase
    .from('cierres_caja')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('estado', 'abierto')
    .maybeSingle();
  if (error) return null;
  return (data as unknown as Cierre) ?? null;
}

export async function abrirCaja(datos: {
  usuarioId: number;
  sucursalId: number;
  turno: string;
  montoInicial: number;
}): Promise<{ ok: boolean; error?: string; cierre?: Cierre }> {
  const turno = datos.turno.trim();
  if (!turno) return { ok: false, error: 'Escribí el turno (ej: Mañana, Tarde, Noche).' };

  const { data, error } = await supabase
    .from('cierres_caja')
    .insert([
      {
        usuario_id: datos.usuarioId,
        sucursal_id: datos.sucursalId,
        turno,
        monto_inicial: datos.montoInicial,
        estado: 'abierto',
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Ya tenés una caja abierta.' };
    return { ok: false, error: error.message };
  }
  return { ok: true, cierre: data as unknown as Cierre };
}

// ===================== Movimientos =====================

export async function listarMovimientos(cierreId: number): Promise<Movimiento[]> {
  const { data } = await supabase
    .from('movimientos_caja')
    .select('*')
    .eq('cierre_id', cierreId)
    .order('created_at', { ascending: false });
  return (data as unknown as Movimiento[]) ?? [];
}

export async function registrarMovimiento(datos: {
  cierre: Cierre;
  tipo: Movimiento['tipo'];
  concepto: string;
  metodoPago: string;
  monto: number;
  referenciaId?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('movimientos_caja').insert([
    {
      cierre_id: datos.cierre.id,
      sucursal_id: datos.cierre.sucursal_id,
      usuario_id: datos.cierre.usuario_id,
      turno: datos.cierre.turno,
      tipo: datos.tipo,
      referencia_id: datos.referenciaId ?? null,
      concepto: datos.concepto,
      metodo_pago: datos.metodoPago,
      monto: datos.monto,
      estado: 'completada',
    },
  ]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function anularMovimiento(movimientoId: number): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('movimientos_caja')
    .update({ estado: 'cancelada' })
    .eq('id', movimientoId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ===================== Totales y cierre =====================

export interface Totales {
  total: number;
  efectivo: number;
  transferencia: number;
  tarjeta: number;
  esperado: number;
}

export async function calcularTotales(cierreId: number): Promise<Totales> {
  const { data } = await supabase
    .from('movimientos_caja')
    .select('monto, metodo_pago, estado')
    .eq('cierre_id', cierreId)
    .eq('estado', 'completada');

  const filas = (data as { monto: unknown; metodo_pago: string }[]) ?? [];
  const totales: Totales = { total: 0, efectivo: 0, transferencia: 0, tarjeta: 0, esperado: 0 };
  for (const f of filas) {
    const monto = n(f.monto);
    totales.total += monto;
    const metodo = (f.metodo_pago || '').toLowerCase();
    if (metodo.includes('efectivo')) totales.efectivo += monto;
    else if (metodo.includes('transfer')) totales.transferencia += monto;
    else if (metodo.includes('tarjeta')) totales.tarjeta += monto;
  }
  totales.esperado = totales.efectivo;
  return totales;
}

export async function cerrarCaja(
  cierre: Cierre,
  datos: { montoContado: number; notas?: string }
): Promise<{ ok: boolean; error?: string; cierre?: Cierre }> {
  const totales = await calcularTotales(cierre.id);
  const esperado = n(cierre.monto_inicial) + totales.efectivo;
  const diferencia = datos.montoContado - esperado;

  const { data, error } = await supabase
    .from('cierres_caja')
    .update({
      estado: 'cerrado',
      fecha_cierre: new Date().toISOString(),
      monto_contado: datos.montoContado,
      diferencia,
      total_ventas: totales.total,
      total_efectivo: totales.efectivo,
      total_transferencia: totales.transferencia,
      total_tarjeta: totales.tarjeta,
      notas: datos.notas ?? '',
    })
    .eq('id', cierre.id)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, cierre: data as unknown as Cierre };
}

// ===================== Historial (solo administrador) =====================

export interface CierreHistorial extends Cierre {
  usuarios?: { id: number; usuario: string; nombre: string } | null;
  sucursales?: { id: number; nombre: string } | null;
}

export async function historialCierres(filtro: {
  sucursalId?: number | null;
  usuarioId?: number | null;
  desde?: string | null;
  hasta?: string | null;
}): Promise<CierreHistorial[]> {
  let q = supabase
    .from('cierres_caja')
    .select('*, usuarios(id, usuario, nombre), sucursales(id, nombre)')
    .order('fecha_apertura', { ascending: false })
    .limit(300);

  if (filtro.sucursalId) q = q.eq('sucursal_id', filtro.sucursalId);
  if (filtro.usuarioId) q = q.eq('usuario_id', filtro.usuarioId);
  if (filtro.desde) q = q.gte('fecha_apertura', filtro.desde);
  if (filtro.hasta) q = q.lte('fecha_apertura', filtro.hasta);

  const { data } = await q;
  return (data as unknown as CierreHistorial[]) ?? [];
}
