"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../app/supabase';

export default function ClientesCC({ darkMode = true }: { darkMode?: boolean }) {
  const [clientes, setClientes] = useState<any[]>([]);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [esGremio, setEsGremio] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [cargando, setCargando] = useState(true);
  
  const [clienteExpandido, setClienteExpandido] = useState<any>(null);
  const [ordenesPendientes, setOrdenesPendientes] = useState<any[]>([]);

  const theme = {
    card: darkMode ? '#1e293b' : '#ffffff',
    bg: darkMode ? '#0f172a' : '#f8fafc',
    text: darkMode ? '#f8fafc' : '#0f172a',
    subtext: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#e2e8f0',
    input: darkMode ? '#0f172a' : '#ffffff',
    innerBox: darkMode ? '#0f172a' : '#f1f5f9',
    hover: darkMode ? '#161e2e' : '#f9fafb',
    accent: '#8B5CF6'
  };

  const cardStyle: React.CSSProperties = { 
    backgroundColor: theme.card, 
    padding: '25px', 
    borderRadius: '20px', 
    border: `1px solid ${theme.border}`, 
    boxShadow: darkMode ? '0 4px 15px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease'
  };

  const inputStyle: React.CSSProperties = { 
    padding: '12px', 
    borderRadius: '10px', 
    border: `1px solid ${theme.border}`, 
    backgroundColor: theme.input, 
    color: theme.text, 
    width: '100%', 
    outline: 'none', 
    marginBottom: '15px'
  };

  const btnStyle: React.CSSProperties = { 
    padding: '12px 20px', 
    borderRadius: '10px', 
    border: 'none', 
    fontWeight: 'bold', 
    cursor: 'pointer'
  };

  const cargarClientes = async () => {
    setCargando(true);
    const { data } = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
    if (data) setClientes(data);
    setCargando(false);
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const verDetalleCliente = async (cliente: any) => {
    setClienteExpandido(cliente);
    const { data } = await supabase
      .from('ordenes')
      .select('*')
      .eq('cliente_id', cliente.id)
      .neq('estado_orden', 'Entregado');
    if (data) setOrdenesPendientes(data);
  };

  const crearCliente = async () => {
    if (!nombre.trim()) return alert("Por favor, ingresa el nombre.");
    try {
      const { error } = await supabase.from('clientes').insert([{ nombre, telefono, es_gremio: esGremio, saldo_cc: 0 }]);
      if (error) throw error;
      alert("Cliente guardado");
      setNombre(''); setTelefono(''); setEsGremio(false);
      cargarClientes();
    } catch (error: any) { alert("Error: " + error.message); }
  };

  const eliminarCliente = async (e: React.MouseEvent, cliente: any) => {
    e.stopPropagation();
    const tieneDeuda = cliente.saldo_cc > 0;
    const mensaje = tieneDeuda 
      ? `⚠️ DEUDA ACTIVA: $${cliente.saldo_cc}. ¿Borrar igual?` 
      : `¿Eliminar a ${cliente.nombre}?`;
    if (window.confirm(mensaje)) {
      const { error } = await supabase.from('clientes').delete().eq('id', cliente.id);
      if (!error) {
        alert("Cliente eliminado.");
        cargarClientes();
        if (clienteExpandido?.id === cliente.id) setClienteExpandido(null);
      }
    }
  };

  const registrarPago = async (cliente: any) => {
    const montoStr = prompt(`¿Cuánto abona ${cliente.nombre}? (Saldo actual: $${cliente.saldo_cc})`);
    if (montoStr === null) return;
    const monto = Number(montoStr);
    if (isNaN(monto) || monto <= 0) return alert("Monto no válido");
    const nuevoSaldo = cliente.saldo_cc - monto;
    const { error } = await supabase.from('clientes').update({ saldo_cc: nuevoSaldo }).eq('id', cliente.id);
    if (!error) { 
      alert(`Pago registrado. Nuevo saldo: $${nuevoSaldo}`);
      await cargarClientes(); 
      setClienteExpandido(null); 
    }
  };

  const saldarTotal = async (cliente: any) => {
    if (window.confirm(`¿Saldar deuda TOTAL de $${cliente.saldo_cc}?`)) {
      const { error: err1 } = await supabase.from('clientes').update({ saldo_cc: 0 }).eq('id', cliente.id);
      const { error: err2 } = await supabase
        .from('ordenes')
        .update({ estado_orden: 'Entregado', fecha_entrega: new Date().toLocaleDateString('es-AR') })
        .eq('cliente_id', cliente.id)
        .neq('estado_orden', 'Entregado');
      if (!err1) { 
        alert("Cuenta saldada correctamente.");
        await cargarClientes(); 
        setClienteExpandido(null); 
      }
    }
  };

  const clientesFiltrados = clientes.filter(c => c.nombre.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '25px', padding: '10px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={cardStyle}>
          <h2 style={{ color: theme.text, marginBottom: '20px', fontSize: '1.4rem' }}>👤 Registrar Cliente</h2>
          <label style={{ color: theme.subtext, fontSize: '0.8rem', fontWeight: 'bold' }}>NOMBRE COMPLETO</label>
          <input style={inputStyle} value={nombre} onChange={e => setNombre(e.target.value)} />
          <label style={{ color: theme.subtext, fontSize: '0.8rem', fontWeight: 'bold' }}>TELÉFONO</label>
          <input style={inputStyle} value={telefono} onChange={e => setTelefono(e.target.value)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', cursor: 'pointer' }} onClick={() => setEsGremio(!esGremio)}>
            <input type="checkbox" checked={esGremio} readOnly />
            <span style={{ color: theme.text, fontSize: '0.9rem' }}>¿Es cliente de Gremio?</span>
          </div>
          <button onClick={crearCliente} style={{ ...btnStyle, backgroundColor: '#3b82f6', color: '#fff', width: '100%' }}>➕ GUARDAR</button>
        </div>

        <div style={{ ...cardStyle, textAlign: 'center', border: `2px solid ${darkMode ? '#7f1d1d' : '#fee2e2'}` }}>
            <h4 style={{ color: theme.subtext, margin: 0, fontSize: '0.75rem', fontWeight: 'bold' }}>TOTAL DEUDA EN CALLE (CC)</h4>
            <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#f87171' }}>
                ${clientes.reduce((acc, c) => acc + (Number(c.saldo_cc) || 0), 0).toLocaleString()}
            </div>
        </div>
      </div>

      <div style={cardStyle}>
        {!clienteExpandido ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ color: theme.text, margin: 0 }}>💳 Cuentas Corrientes</h2>
              <input placeholder="🔍 Buscar cliente..." value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...inputStyle, width: '300px', marginBottom: 0 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {clientesFiltrados.map(cliente => (
                <div key={cliente.id} onClick={() => verDetalleCliente(cliente)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px', backgroundColor: theme.innerBox, borderRadius: '15px', border: `1px solid ${theme.border}`, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={(e) => eliminarCliente(e, cliente)} style={{ background: darkMode ? '#2d1a1a' : '#fee2e2', border: `1px solid ${darkMode ? '#7f1d1d' : '#f87171'}`, color: '#f87171', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}>🗑️</button>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: theme.text, fontWeight: 'bold', fontSize: '1.1rem' }}>{cliente.nombre}</span>
                        {cliente.es_gremio && <span style={{ backgroundColor: '#6366F1', color: '#fff', fontSize: '0.6rem', padding: '3px 8px', borderRadius: '5px', fontWeight: 'bold' }}>GREMIO</span>}
                      </div>
                      <div style={{ color: theme.subtext, fontSize: '0.85rem' }}>📞 {cliente.telefono || 'Sin teléfono'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: theme.subtext, fontSize: '0.7rem', fontWeight: 'bold' }}>SALDO PENDIENTE</div>
                    <div style={{ color: cliente.saldo_cc > 0 ? '#f87171' : '#10b981', fontSize: '1.4rem', fontWeight: '900' }}>${(Number(cliente.saldo_cc) || 0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div>
            <button onClick={() => setClienteExpandido(null)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' }}>⬅️ VOLVER A LA LISTA</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '20px' }}>
                <div>
                  <h2 style={{ color: theme.text, margin: 0 }}>{clienteExpandido.nombre}</h2>
                  <p style={{ color: theme.subtext, margin: 0 }}>Detalle de órdenes adeudadas</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#f87171', fontSize: '1.8rem', fontWeight: '900' }}>Adeuda: ${(Number(clienteExpandido.saldo_cc) || 0).toLocaleString()}</div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button onClick={() => registrarPago(clienteExpandido)} style={{ ...btnStyle, backgroundColor: darkMode ? '#334155' : '#e2e8f0', color: theme.text }}>💸 REGISTRAR PAGO</button>
                    <button onClick={() => saldarTotal(clienteExpandido)} style={{ ...btnStyle, backgroundColor: '#10b981', color: '#fff' }}>✅ SALDAR TOTAL</button>
                  </div>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {ordenesPendientes.length > 0 ? (
                ordenesPendientes.map((orden) => (
                  <div key={orden.id} style={{ backgroundColor: theme.innerBox, padding: '18px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', border: `1px solid ${theme.border}` }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: theme.text, fontSize: '1rem' }}>{orden.equipo}</div>
                      <div style={{ fontSize: '0.85rem', color: theme.subtext }}>
                        {orden.falla} — <span style={{ color: theme.accent }}>{orden.fecha}</span>
                      </div>
                    </div>
                    <div style={{ fontWeight: '900', color: '#f87171', fontSize: '1.1rem' }}>$ {orden.saldo}</div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: theme.subtext, marginTop: '20px' }}>No hay órdenes pendientes para este cliente.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}