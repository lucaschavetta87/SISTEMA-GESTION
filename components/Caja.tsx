"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../app/supabase';
import type { Sesion } from '../app/lib/auth';
import {
  abrirCaja,
  calcularTotales,
  cerrarCaja,
  listarMovimientos,
  registrarMovimiento,
  type Cierre,
  type Movimiento,
  type Totales,
} from '../app/lib/caja';

interface CajaProps {
  sesion: Sesion;
  cierre: Cierre | null;
  onCambio: () => void;
  onIrAVentas?: () => void;
  darkMode?: boolean;
}

const METODOS = ['Efectivo', 'Transferencia', 'Tarjeta'];

export default function Caja({ sesion, cierre, onCambio, onIrAVentas, darkMode = true }: CajaProps) {
  const [turno, setTurno] = useState('');
  const [montoInicial, setMontoInicial] = useState('0');
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [montoContado, setMontoContado] = useState('');
  const [notas, setNotas] = useState('');
  const [verCobro, setVerCobro] = useState(false);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [ultimoCierre, setUltimoCierre] = useState<Cierre | null>(null);

  const theme = {
    card: darkMode ? '#1e293b' : '#ffffff',
    bg: darkMode ? '#0f172a' : '#f8fafc',
    text: darkMode ? '#f8fafc' : '#0f172a',
    subtext: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#e2e8f0',
    input: darkMode ? '#0f172a' : '#ffffff',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.card,
    padding: '25px',
    borderRadius: '20px',
    border: `1px solid ${theme.border}`,
    boxShadow: darkMode ? '0 4px 15px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
  };

  const inputStyle: React.CSSProperties = {
    padding: '12px',
    borderRadius: '10px',
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.input,
    color: theme.text,
    width: '100%',
    outline: 'none',
    fontSize: '14px',
  };

  const btn = (color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    backgroundColor: color,
    color: '#fff',
    border: 'none',
    padding: '12px 18px',
    borderRadius: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.85rem',
    ...extra,
  });

  const recargar = async (cierreId: number) => {
    const [movs, tot] = await Promise.all([listarMovimientos(cierreId), calcularTotales(cierreId)]);
    setMovimientos(movs);
    setTotales(tot);
  };

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      if (cierre) {
        const [movs, tot] = await Promise.all([listarMovimientos(cierre.id), calcularTotales(cierre.id)]);
        if (!vivo) return;
        setMovimientos(movs);
        setTotales(tot);
      } else {
        setMovimientos([]);
        setTotales(null);
      }
    };
    void cargar();
    return () => { vivo = false; };
  }, [cierre?.id]);

  useEffect(() => {
    if (!verCobro) return;
    const cargar = async () => {
      const { data } = await supabase
        .from('ordenes')
        .select('*')
        .eq('sucursal_id', sesion.sucursal.id)
        .order('id', { ascending: false });
      const pendientes = (data as any[] | null) ?? [];
      setOrdenes(pendientes.filter((o) => Number(o.saldo) > 0 && o.estado_orden !== 'Entregado'));
    };
    cargar();
  }, [verCobro, sesion.sucursal.id]);

  const manejarApertura = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    const res = await abrirCaja({
      usuarioId: sesion.id,
      sucursalId: sesion.sucursal.id,
      turno,
      montoInicial: Number(montoInicial) || 0,
    });
    setCargando(false);
    if (!res.ok) return alert(res.error);
    setTurno('');
    setMontoInicial('0');
    onCambio();
  };

  const manejarCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cierre) return;
    if (montoContado === '') return alert('Cargá el efectivo contado.');
    setCargando(true);
    const res = await cerrarCaja(cierre, { montoContado: Number(montoContado), notas });
    setCargando(false);
    if (!res.ok) return alert(res.error);
    setUltimoCierre(res.cierre!);
    setCerrando(false);
    setMontoContado('');
    setNotas('');
    onCambio();
  };

  const cobrarServicio = async (orden: any) => {
    if (!cierre) return;
    const monto = window.prompt(
      `¿Cuánto cobrás de la orden #${orden.id}?\nSaldo pendiente: $${Number(orden.saldo).toLocaleString('es-AR')}`,
      String(orden.saldo)
    );
    if (monto === null) return;
    const valor = Number(monto);
    if (!valor || valor <= 0) return alert('Monto inválido.');

    const metodo =
      window.prompt('Método de pago: Efectivo, Transferencia o Tarjeta', 'Efectivo') || 'Efectivo';

    const mov = await registrarMovimiento({
      cierre,
      tipo: 'servicio_tecnico',
      concepto: `Servicio técnico #${orden.id} – ${orden.nombre} (${orden.equipo || 'equipo'})`,
      metodoPago: metodo,
      monto: valor,
      referenciaId: orden.id,
    });
    if (!mov.ok) return alert('No se pudo registrar: ' + mov.error);

    const nuevoSaldo = Math.max(0, Number(orden.saldo) - valor);
    const nuevoEstado = nuevoSaldo === 0 ? 'Entregado' : orden.estado_orden;
    const { error } = await supabase
      .from('ordenes')
      .update({
        saldo: nuevoSaldo,
        estado_orden: nuevoEstado,
        fecha_entrega: nuevoEstado === 'Entregado' ? new Date().toISOString() : orden.fecha_entrega ?? null,
      })
      .eq('id', orden.id);
    if (error) alert('Cobro registrado, pero no se pudo actualizar la orden: ' + error.message);

    if (orden.es_cuenta_corriente && orden.cliente_id) {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('saldo_cc')
        .eq('id', orden.cliente_id)
        .maybeSingle();
      const saldoActual = Number((cliente as any)?.saldo_cc) || 0;
      await supabase
        .from('clientes')
        .update({ saldo_cc: Math.max(0, saldoActual - valor) })
        .eq('id', orden.cliente_id);
    }

    alert('✅ Cobro registrado en la caja.');
    setVerCobro(false);
    await recargar(cierre.id);
  };

  const esperado = totales ? (Number(cierre?.monto_inicial) || 0) + totales.efectivo : 0;

  // ---------------- CAJA ABIERTA ----------------
  if (cierre) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ color: theme.text, fontWeight: 800, margin: 0 }}>💵 Caja – {sesion.sucursal.nombre}</h2>
          <span style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '8px 16px', borderRadius: '20px', fontWeight: 800, fontSize: '0.8rem' }}>
            ABIERTA · TURNO: {(cierre.turno || '—').toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          {[
            { l: 'Total del turno', v: totales?.total ?? 0, c: '#10b981' },
            { l: 'Efectivo', v: totales?.efectivo ?? 0, c: '#3b82f6' },
            { l: 'Transferencia', v: totales?.transferencia ?? 0, c: '#8b5cf6' },
            { l: 'Tarjeta', v: totales?.tarjeta ?? 0, c: '#f59e0b' },
            { l: 'Efectivo esperado', v: esperado, c: '#ec4899' },
          ].map((t) => (
            <div key={t.l} style={{ ...cardStyle, padding: '18px' }}>
              <div style={{ color: theme.subtext, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{t.l}</div>
              <div style={{ color: t.c, fontSize: '1.6rem', fontWeight: 900, marginTop: '6px' }}>
                ${t.v.toLocaleString('es-AR')}
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {onIrAVentas && (
            <button onClick={onIrAVentas} style={btn('#3b82f6')}>➕ Registrar venta de stock</button>
          )}
          <button onClick={() => setVerCobro(!verCobro)} style={btn('#8b5cf6')}>
            {verCobro ? '✖ Cerrar' : '🧾 Cobrar servicio técnico'}
          </button>
          <button onClick={() => setCerrando(!cerrando)} style={btn(cerrando ? '#475569' : '#ef4444')}>
            {cerrando ? '✖ Volver' : '🔒 Cerrar caja'}
          </button>
        </div>

        {verCobro && (
          <div style={cardStyle}>
            <h3 style={{ color: theme.text, marginTop: 0 }}>Servicios técnicos con saldo pendiente</h3>
            {ordenes.length === 0 && <p style={{ color: theme.subtext }}>No hay órdenes con saldo pendiente en esta sucursal.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ordenes.map((o) => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: theme.bg, borderRadius: '12px', border: `1px solid ${theme.border}`, flexWrap: 'wrap' }}>
                  <div style={{ color: theme.text }}>
                    <strong>#{String(o.id).slice(-6)}</strong> {o.nombre} – {o.equipo}
                    <div style={{ fontSize: '0.75rem', color: theme.subtext }}>Saldo: ${Number(o.saldo).toLocaleString('es-AR')}</div>
                  </div>
                  <button onClick={() => cobrarServicio(o)} style={btn('#10b981', { padding: '8px 14px' })}>💵 COBRAR</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {cerrando && (
          <form onSubmit={manejarCierre} style={{ ...cardStyle, border: '2px solid #ef4444' }}>
            <h3 style={{ color: '#ef4444', marginTop: 0 }}>Cerrar caja – turno {(cierre.turno || '').toUpperCase()}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: theme.subtext, fontWeight: 700 }}>
                  EFECTIVO CONTADO (${esperado.toLocaleString('es-AR')} esperados)
                </label>
                <input type="number" step="0.01" required value={montoContado} onChange={(e) => setMontoContado(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: theme.subtext, fontWeight: 700 }}>NOTAS</label>
                <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} style={inputStyle} placeholder="Opcional" />
              </div>
            </div>
            <div style={{ marginTop: '14px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: theme.text, fontWeight: 700 }}>
                Diferencia:{' '}
                <span style={{ color: (Number(montoContado) || 0) - esperado === 0 ? '#10b981' : '#ef4444' }}>
                  ${((Number(montoContado) || 0) - esperado).toLocaleString('es-AR')}
                </span>
              </span>
              <button type="submit" disabled={cargando} style={btn('#ef4444')}>
                {cargando ? 'Cerrando…' : '✅ CONFIRMAR CIERRE'}
              </button>
            </div>
          </form>
        )}

        <div style={cardStyle}>
          <h3 style={{ color: theme.text, marginTop: 0 }}>Movimientos del turno ({movimientos.length})</h3>
          {movimientos.length === 0 && <p style={{ color: theme.subtext }}>Todavía no se registró nada en esta caja.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {movimientos.map((m) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px', backgroundColor: theme.bg, borderRadius: '10px', border: `1px solid ${theme.border}`, opacity: m.estado === 'cancelada' ? 0.5 : 1, flexWrap: 'wrap' }}>
                <div style={{ color: theme.text, fontSize: '0.85rem' }}>
                  <span style={{ marginRight: '8px' }}>
                    {m.tipo === 'producto' ? '📦' : m.tipo === 'servicio_tecnico' ? '🛠️' : m.tipo === 'seña' ? '🤝' : '➖'}
                  </span>
                  {m.concepto}
                  <div style={{ fontSize: '0.7rem', color: theme.subtext }}>
                    {m.metodo_pago} · {new Date(m.created_at).toLocaleTimeString('es-AR')} · turno {m.turno || '—'}
                  </div>
                </div>
                <div style={{ fontWeight: 800, color: m.monto < 0 ? '#ef4444' : '#10b981' }}>
                  ${Number(m.monto).toLocaleString('es-AR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------- SIN CAJA ABIERTA ----------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ color: theme.text, fontWeight: 800, margin: 0 }}>💵 Caja – {sesion.sucursal.nombre}</h2>

      {ultimoCierre && (
        <div style={{ ...cardStyle, border: '1px solid #10b981' }}>
          <h3 style={{ color: '#10b981', marginTop: 0 }}>Último cierre realizado</h3>
          <div style={{ color: theme.text, display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            <span>Turno: <strong>{ultimoCierre.turno}</strong></span>
            <span>Total: <strong>${Number(ultimoCierre.total_ventas).toLocaleString('es-AR')}</strong></span>
            <span>Contado: <strong>${Number(ultimoCierre.monto_contado).toLocaleString('es-AR')}</strong></span>
            <span>
              Diferencia:{' '}
              <strong style={{ color: Number(ultimoCierre.diferencia) === 0 ? '#10b981' : '#ef4444' }}>
                ${Number(ultimoCierre.diferencia).toLocaleString('es-AR')}
              </strong>
            </span>
          </div>
        </div>
      )}

      <form onSubmit={manejarApertura} style={cardStyle}>
        <h3 style={{ color: '#3b82f6', marginTop: 0 }}>Abrir caja</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: theme.subtext, fontWeight: 700 }}>TURNO (texto libre)</label>
            <input list="turnos-sugeridos" required value={turno} onChange={(e) => setTurno(e.target.value)} placeholder="Ej: Mañana, Tarde, Noche…" style={inputStyle} />
            <datalist id="turnos-sugeridos">
              <option value="Mañana" />
              <option value="Tarde" />
              <option value="Noche" />
            </datalist>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: theme.subtext, fontWeight: 700 }}>MONTO INICIAL EN EFECTIVO</label>
            <input type="number" step="0.01" value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <button type="submit" disabled={cargando} style={{ ...btn('#3b82f6'), marginTop: '16px', width: '100%' }}>
          {cargando ? 'Abriendo…' : '🔓 ABRIR CAJA'}
        </button>
      </form>
    </div>
  );
}
