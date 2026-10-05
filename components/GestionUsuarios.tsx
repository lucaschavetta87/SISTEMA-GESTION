"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../app/supabase';
import { MODULOS, esAdmin, hashearPassword, type Sesion } from '../app/lib/auth';
import { historialCierres, listarMovimientos, type CierreHistorial, type Movimiento } from '../app/lib/caja';

interface Props {
  sesion: Sesion;
  darkMode?: boolean;
}

type Vista = 'usuarios' | 'sucursales' | 'historial';

interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  es_principal: boolean;
  activa: boolean;
}

interface UsuarioFila {
  id: number;
  usuario: string;
  nombre: string;
  rol: 'admin' | 'usuario';
  activo: boolean;
  modulos: string[] | null;
  sucursal_id: number | null;
  sucursales?: { id: number; nombre: string } | null;
}

const VACIO_USUARIO = { id: 0, usuario: '', nombre: '', password: '', rol: 'usuario' as 'admin' | 'usuario', sucursal_id: 0, modulos: ['inicio'] as string[] };
const VACIO_SUCURSAL = { id: 0, nombre: '', direccion: '' };

export default function GestionUsuarios({ sesion, darkMode = true }: Props) {
  const [vista, setVista] = useState<Vista>('usuarios');
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioFila[]>([]);
  const [form, setForm] = useState({ ...VACIO_USUARIO });
  const [formSuc, setFormSuc] = useState({ ...VACIO_SUCURSAL });
  const [guardando, setGuardando] = useState(false);

  const [cierres, setCierres] = useState<CierreHistorial[]>([]);
  const [detalle, setDetalle] = useState<{ cierre: CierreHistorial; movs: Movimiento[] } | null>(null);
  const [filtroSuc, setFiltroSuc] = useState('');
  const [filtroUsu, setFiltroUsu] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const theme = {
    card: darkMode ? '#1e293b' : '#ffffff',
    bg: darkMode ? '#0f172a' : '#f8fafc',
    text: darkMode ? '#f8fafc' : '#0f172a',
    subtext: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#e2e8f0',
    input: darkMode ? '#0f172a' : '#ffffff',
    row: darkMode ? '#0f172a' : '#f1f5f9',
  };

  const card: React.CSSProperties = {
    backgroundColor: theme.card,
    padding: '24px',
    borderRadius: '20px',
    border: `1px solid ${theme.border}`,
    boxShadow: darkMode ? '0 4px 15px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
  };
  const input: React.CSSProperties = {
    padding: '11px',
    borderRadius: '10px',
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.input,
    color: theme.text,
    width: '100%',
    outline: 'none',
    fontSize: '14px',
    boxSizing: 'border-box',
  };
  const btn = (color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    backgroundColor: color,
    color: '#fff',
    border: 'none',
    padding: '11px 18px',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.82rem',
    ...extra,
  });
  const tabBtn = (id: Vista, label: string): React.CSSProperties => ({
    ...btn(vista === id ? '#6366f1' : darkMode ? '#334155' : '#e2e8f0'),
    color: vista === id ? '#fff' : theme.text,
  });

  // ---------- carga ----------
  const cargarSucursales = async () => {
    const { data } = await supabase.from('sucursales').select('*').order('id', { ascending: true });
    if (data) setSucursales(data as Sucursal[]);
  };

  const cargarUsuarios = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('id, usuario, nombre, rol, activo, modulos, sucursal_id, sucursales(id, nombre)')
      .order('usuario', { ascending: true });
    if (data) setUsuarios(data as unknown as UsuarioFila[]);
  };

  const cargarHistorial = async () => {
    const res = await historialCierres({
      sucursalId: filtroSuc ? Number(filtroSuc) : null,
      usuarioId: filtroUsu ? Number(filtroUsu) : null,
      desde: desde ? new Date(`${desde}T00:00:00`).toISOString() : null,
      hasta: hasta ? new Date(`${hasta}T23:59:59`).toISOString() : null,
    });
    setCierres(res);
  };

  useEffect(() => {
    cargarSucursales();
    cargarUsuarios();
  }, []);

  useEffect(() => {
    if (vista === 'historial') cargarHistorial();
  }, [vista, filtroSuc, filtroUsu, desde, hasta]);

  // ---------- usuarios ----------
  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (form.id) {
        const payload: any = {
          usuario: form.usuario.trim(),
          nombre: form.nombre.trim(),
          rol: form.rol,
          sucursal_id: form.sucursal_id || null,
          modulos: form.rol === 'admin' ? MODULOS.map((m) => m.id) : form.modulos,
        };
        if (form.password) payload.password_hash = hashearPassword(form.password);
        const { error } = await supabase.from('usuarios').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        if (!form.password) throw new Error('Ingresá la contraseña del nuevo usuario.');
        const { error } = await supabase.from('usuarios').insert([
          {
            usuario: form.usuario.trim(),
            nombre: form.nombre.trim(),
            password_hash: hashearPassword(form.password),
            rol: form.rol,
            sucursal_id: form.sucursal_id || null,
            modulos: form.rol === 'admin' ? MODULOS.map((m) => m.id) : form.modulos,
            activo: true,
          },
        ]);
        if (error) throw error;
      }
      setForm({ ...VACIO_USUARIO, sucursal_id: sucursales[0]?.id || 0 });
      await cargarUsuarios();
    } catch (err: any) {
      alert('Error: ' + (err?.message || err));
    } finally {
      setGuardando(false);
    }
  };

  const editarUsuario = (u: UsuarioFila) => {
    setForm({
      id: u.id,
      usuario: u.usuario,
      nombre: u.nombre || '',
      password: '',
      rol: u.rol,
      sucursal_id: u.sucursal_id || 0,
      modulos: u.modulos && u.modulos.length ? u.modulos : ['inicio'],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const alternarActivo = async (u: UsuarioFila) => {
    if (u.id === sesion.id) return alert('No podés desactivarte a vos mismo.');
    const { error } = await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id);
    if (error) return alert(error.message);
    await cargarUsuarios();
  };

  const borrarUsuario = async (u: UsuarioFila) => {
    if (u.id === sesion.id) return alert('No podés borrarte a vos mismo.');
    if (!window.confirm(`¿Eliminar el usuario "${u.usuario}"? Sus cierres de caja quedan en el historial.`)) return;
    const { error } = await supabase.from('usuarios').delete().eq('id', u.id);
    if (error) return alert(error.message);
    await cargarUsuarios();
  };

  // ---------- sucursales ----------
  const guardarSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (formSuc.id) {
        const { error } = await supabase
          .from('sucursales')
          .update({ nombre: formSuc.nombre.trim(), direccion: formSuc.direccion.trim() })
          .eq('id', formSuc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sucursales')
          .insert([{ nombre: formSuc.nombre.trim(), direccion: formSuc.direccion.trim(), es_principal: false }]);
        if (error) throw error;
      }
      setFormSuc({ ...VACIO_SUCURSAL });
      await cargarSucursales();
    } catch (err: any) {
      alert('Error: ' + (err?.message || err));
    } finally {
      setGuardando(false);
    }
  };

  const borrarSucursal = async (s: Sucursal) => {
    if (s.es_principal) return alert('La sucursal principal no se puede eliminar.');
    if (!window.confirm(`¿Eliminar la sucursal "${s.nombre}"?`)) return;
    const { error } = await supabase.from('sucursales').delete().eq('id', s.id);
    if (error) return alert(error.message + '\n(Puede tener usuarios u órdenes asociados)');
    await cargarSucursales();
  };

  const abrirDetalle = async (c: CierreHistorial) => {
    const movs = await listarMovimientos(c.id);
    setDetalle({ cierre: c, movs });
  };

  if (!esAdmin(sesion)) {
    return <div style={{ ...card, color: theme.text }}>No tenés permiso para ver esta sección.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ color: theme.text, fontWeight: 800, margin: 0 }}>👥 Gestión de Usuarios</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setVista('usuarios')} style={tabBtn('usuarios', '')}>👤 Usuarios</button>
          <button onClick={() => setVista('sucursales')} style={tabBtn('sucursales', '')}>🏪 Sucursales</button>
          <button onClick={() => setVista('historial')} style={tabBtn('historial', '')}>📒 Historial de cierres</button>
        </div>
      </div>

      {/* ================= USUARIOS ================= */}
      {vista === 'usuarios' && (
        <>
          <form onSubmit={guardarUsuario} style={card}>
            <h3 style={{ color: form.id ? '#f59e0b' : '#6366f1', marginTop: 0 }}>
              {form.id ? `✏️ Editando usuario "${form.usuario}"` : '➕ Nuevo usuario'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: theme.subtext, fontWeight: 700 }}>USUARIO (para entrar)</label>
                <input required value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} style={input} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: theme.subtext, fontWeight: 700 }}>NOMBRE / APELLIDO</label>
                <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={input} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: theme.subtext, fontWeight: 700 }}>
                  CONTRASEÑA {form.id && '(dejar vacío para no cambiar)'}
                </label>
                <input type="text" required={!form.id} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={input} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: theme.subtext, fontWeight: 700 }}>ROL</label>
                <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as any })} style={input}>
                  <option value="usuario">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: theme.subtext, fontWeight: 700 }}>SUCURSAL</label>
                <select required value={form.sucursal_id} onChange={(e) => setForm({ ...form, sucursal_id: Number(e.target.value) })} style={input}>
                  <option value={0}>— Elegir sucursal —</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {form.rol !== 'admin' && (
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '0.72rem', color: theme.subtext, fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  MÓDULOS A LOS QUE PUEDE ACCEDER
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px' }}>
                  {MODULOS.filter((m) => !m.soloAdmin).map((m) => {
                    const marcado = form.modulos.includes(m.id);
                    return (
                      <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: theme.text, backgroundColor: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '9px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() =>
                            setForm({
                              ...form,
                              modulos: marcado ? form.modulos.filter((x) => x !== m.id) : [...form.modulos, m.id],
                            })
                          }
                        />
                        {m.icono} {m.etiqueta}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {form.rol === 'admin' && (
              <p style={{ color: '#f59e0b', fontSize: '0.8rem', marginTop: '14px', marginBottom: 0 }}>
                ⚠️ El administrador tiene acceso a todos los módulos, incluida esta pantalla.
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="submit" disabled={guardando} style={btn(form.id ? '#f59e0b' : '#6366f1')}>
                {guardando ? 'Guardando…' : form.id ? '💾 ACTUALIZAR' : '➕ CREAR USUARIO'}
              </button>
              {form.id > 0 && (
                <button type="button" onClick={() => setForm({ ...VACIO_USUARIO })} style={btn('#475569')}>CANCELAR</button>
              )}
            </div>
          </form>

          <div style={card}>
            <h3 style={{ color: theme.text, marginTop: 0 }}>Usuarios ({usuarios.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: theme.subtext, borderBottom: `1px solid ${theme.border}` }}>
                    <th style={{ padding: '10px' }}>USUARIO</th>
                    <th>NOMBRE</th>
                    <th>SUCURSAL</th>
                    <th>ROL</th>
                    <th>MÓDULOS</th>
                    <th>ESTADO</th>
                    <th style={{ textAlign: 'right' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${theme.row}` }}>
                      <td style={{ padding: '10px', color: theme.text, fontWeight: 700 }}>{u.usuario}</td>
                      <td style={{ color: theme.text }}>{u.nombre}</td>
                      <td style={{ color: theme.text }}>{u.sucursales?.nombre || '—'}</td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: u.rol === 'admin' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)', color: u.rol === 'admin' ? '#f59e0b' : '#818cf8' }}>
                          {u.rol === 'admin' ? 'ADMIN' : 'USUARIO'}
                        </span>
                      </td>
                      <td style={{ color: theme.subtext, fontSize: '0.75rem' }}>
                        {u.rol === 'admin'
                          ? 'Todos'
                          : (u.modulos || []).map((m) => MODULOS.find((x) => x.id === m)?.icono || '').join(' ') || '—'}
                      </td>
                      <td>
                        <span style={{ color: u.activo ? '#10b981' : '#ef4444', fontWeight: 800, fontSize: '0.75rem' }}>
                          {u.activo ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => editarUsuario(u)} style={{ ...btn('#3b82f6'), padding: '6px 10px', marginRight: '6px' }}>✏️</button>
                        <button onClick={() => alternarActivo(u)} style={{ ...btn(u.activo ? '#f59e0b' : '#10b981'), padding: '6px 10px', marginRight: '6px' }}>
                          {u.activo ? '⏸' : '▶'}
                        </button>
                        <button onClick={() => borrarUsuario(u)} style={{ ...btn('#ef4444'), padding: '6px 10px' }}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================= SUCURSALES ================= */}
      {vista === 'sucursales' && (
        <>
          <form onSubmit={guardarSucursal} style={card}>
            <h3 style={{ color: formSuc.id ? '#f59e0b' : '#6366f1', marginTop: 0 }}>
              {formSuc.id ? '✏️ Editando sucursal' : '➕ Nueva sucursal'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: theme.subtext, fontWeight: 700 }}>NOMBRE DE LA SUCURSAL</label>
                <input required placeholder="Ej: Sucursal 2 - Centro" value={formSuc.nombre} onChange={(e) => setFormSuc({ ...formSuc, nombre: e.target.value })} style={input} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: theme.subtext, fontWeight: 700 }}>DIRECCIÓN</label>
                <input value={formSuc.direccion} onChange={(e) => setFormSuc({ ...formSuc, direccion: e.target.value })} style={input} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="submit" disabled={guardando} style={btn(formSuc.id ? '#f59e0b' : '#6366f1')}>
                {guardando ? 'Guardando…' : formSuc.id ? '💾 ACTUALIZAR' : '➕ CREAR SUCURSAL'}
              </button>
              {formSuc.id > 0 && (
                <button type="button" onClick={() => setFormSuc({ ...VACIO_SUCURSAL })} style={btn('#475569')}>CANCELAR</button>
              )}
            </div>
          </form>

          <div style={card}>
            <h3 style={{ color: theme.text, marginTop: 0 }}>Sucursales ({sucursales.length})</h3>
            <p style={{ color: theme.subtext, fontSize: '0.8rem', marginTop: '-8px' }}>
              Cada sucursal tiene su propio stock y sus propios cierres de caja. Los usuarios se crean asignados a una sucursal.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sucursales.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px', backgroundColor: theme.bg, borderRadius: '12px', border: `1px solid ${theme.border}`, flexWrap: 'wrap' }}>
                  <div style={{ color: theme.text }}>
                    <strong>{s.nombre}</strong>
                    {s.es_principal && (
                      <span style={{ marginLeft: '8px', fontSize: '0.65rem', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '3px 8px', borderRadius: '10px', fontWeight: 800 }}>
                        PRINCIPAL
                      </span>
                    )}
                    <div style={{ fontSize: '0.78rem', color: theme.subtext }}>{s.direccion || 'Sin dirección'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setFormSuc({ id: s.id, nombre: s.nombre, direccion: s.direccion || '' }); }} style={{ ...btn('#3b82f6'), padding: '8px 12px' }}>✏️</button>
                    {!s.es_principal && (
                      <button onClick={() => borrarSucursal(s)} style={{ ...btn('#ef4444'), padding: '8px 12px' }}>🗑</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ================= HISTORIAL ================= */}
      {vista === 'historial' && (
        <div style={card}>
          <h3 style={{ color: theme.text, marginTop: 0 }}>📒 Historial de cierres de caja</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            <select value={filtroSuc} onChange={(e) => setFiltroSuc(e.target.value)} style={input}>
              <option value="">Todas las sucursales</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <select value={filtroUsu} onChange={(e) => setFiltroUsu(e.target.value)} style={input}>
              <option value="">Todos los usuarios</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.usuario}</option>)}
            </select>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={input} title="Desde" />
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={input} title="Hasta" />
          </div>

          {cierres.length === 0 && <p style={{ color: theme.subtext }}>No hay cierres con esos filtros.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cierres.map((c) => (
              <div key={c.id} style={{ border: `1px solid ${theme.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                <div onClick={() => (detalle?.cierre.id === c.id ? setDetalle(null) : abrirDetalle(c))} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px', backgroundColor: theme.bg, cursor: 'pointer', flexWrap: 'wrap' }}>
                  <div style={{ color: theme.text, fontSize: '0.85rem' }}>
                    <strong>{c.sucursales?.nombre || '—'}</strong> · {c.usuarios?.usuario || '—'} · turno{' '}
                    <strong>{c.turno || '—'}</strong>
                    <div style={{ fontSize: '0.72rem', color: theme.subtext }}>
                      Apertura: {new Date(c.fecha_apertura).toLocaleString('es-AR')}
                      {c.fecha_cierre ? ` → Cierre: ${new Date(c.fecha_cierre).toLocaleString('es-AR')}` : ' (sin cerrar)'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '0.85rem', color: theme.text, flexWrap: 'wrap' }}>
                    <span>Total: <strong>${Number(c.total_ventas).toLocaleString('es-AR')}</strong></span>
                    <span style={{ color: Number(c.diferencia) === 0 || c.diferencia === null ? '#10b981' : '#ef4444', fontWeight: 800 }}>
                      Dif: ${Number(c.diferencia).toLocaleString('es-AR')}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: '10px', backgroundColor: c.estado === 'cerrado' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: c.estado === 'cerrado' ? '#10b981' : '#f59e0b' }}>
                      {c.estado.toUpperCase()}
                    </span>
                    <span style={{ color: theme.subtext }}>{detalle?.cierre.id === c.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {detalle?.cierre.id === c.id && (
                  <div style={{ padding: '14px', borderTop: `1px solid ${theme.border}` }}>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', color: theme.subtext, fontSize: '0.78rem', marginBottom: '10px' }}>
                      <span>Monto inicial: <strong>${Number(c.monto_inicial).toLocaleString('es-AR')}</strong></span>
                      <span>Efectivo: <strong>${Number(c.total_efectivo).toLocaleString('es-AR')}</strong></span>
                      <span>Transferencia: <strong>${Number(c.total_transferencia).toLocaleString('es-AR')}</strong></span>
                      <span>Tarjeta: <strong>${Number(c.total_tarjeta).toLocaleString('es-AR')}</strong></span>
                      <span>Contado: <strong>${Number(c.monto_contado).toLocaleString('es-AR')}</strong></span>
                    </div>
                    {detalle.movs.length === 0 && <p style={{ color: theme.subtext, margin: 0 }}>Sin movimientos.</p>}
                    {detalle.movs.map((m) => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '9px 10px', borderBottom: `1px solid ${theme.row}`, fontSize: '0.82rem', color: theme.text }}>
                        <span>
                          {m.tipo === 'producto' ? '📦' : m.tipo === 'servicio_tecnico' ? '🛠️' : m.tipo === 'seña' ? '🤝' : '➖'}{' '}
                          {m.concepto}
                          <span style={{ color: theme.subtext, fontSize: '0.72rem' }}> · {m.metodo_pago} · {new Date(m.created_at).toLocaleString('es-AR')}</span>
                        </span>
                        <strong style={{ color: m.monto < 0 ? '#ef4444' : '#10b981' }}>${Number(m.monto).toLocaleString('es-AR')}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
