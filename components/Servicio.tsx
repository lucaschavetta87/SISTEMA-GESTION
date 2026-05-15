"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../app/supabase';
import PatternLock from './PatternLock'; 

// Agregamos darkMode a las props
export default function Servicio({ onSave, darkMode = true }: { onSave: (orden: any) => void, darkMode?: boolean }) {
  const [clientes, setClientes] = useState<any[]>([]);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [esCC, setEsCC] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    equipo: '',
    falla: '',
    estadoGeneral: '',
    pinSeguridad: '', 
    patronSeguridad: '',
    presupuestoTotal: 0,
    seña: 0,
  });

  const [reparaciones, setReparaciones] = useState({
    revision: false, 
    pantalla: false,
    bateria: false,
    pinDeCarga: false,
    software: false,
    tapaTrasera: false,
    glass: false,
    bañoQuimico: false,
    pcService: false,
    camaras: false,
    vidriodecamara: false,
    FPC: false,
  });

  // Estilos Dinámicos
  const theme = {
    bg: darkMode ? '#1e293b' : '#ffffff',
    input: darkMode ? '#0f172a' : '#f8fafc',
    text: darkMode ? '#f8fafc' : '#1e293b',
    border: darkMode ? '#334155' : '#e2e8f0',
    label: darkMode ? '#94a3b8' : '#64748b'
  };

  useEffect(() => {
    const cargarClientes = async () => {
      const { data } = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
      if (data) setClientes(data);
    };
    cargarClientes();
  }, []);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReparaciones({ ...reparaciones, [e.target.name]: e.target.checked });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const seleccionarCliente = (cliente: any) => {
    setClienteSeleccionado(cliente);
    setFormData({ ...formData, nombre: cliente.nombre, telefono: cliente.telefono || '' });
    setFiltroCliente(cliente.nombre);
    setMostrarSugerencias(false);
  };

  const handlePatternChange = (patternSequence: string) => {
    setFormData({ ...formData, patronSeguridad: patternSequence });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevaOrden = {
      ...formData,
      reparaciones,
      id: Date.now(),
      fecha: new Date().toLocaleDateString(),
      saldo: formData.presupuestoTotal - formData.seña,
      estado_orden: 'Pendiente',
      cliente_id: clienteSeleccionado?.id || null,
      es_cuenta_corriente: esCC
    };
    onSave(nuevaOrden);
    setClienteSeleccionado(null);
    setEsCC(false);
    setFiltroCliente('');
  };

  const inputStyle = {
    padding: '12px',
    borderRadius: '10px',
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.input,
    color: theme.text,
    width: '100%',
    boxSizing: 'border-box' as 'border-box',
    outline: 'none',
    transition: 'all 0.3s ease'
  };

  const sugerenciaStyle = {
    padding: '10px',
    cursor: 'pointer',
    borderBottom: `1px solid ${theme.border}`,
    color: theme.text,
    fontSize: '0.9rem'
  };

  return (
    <div style={{ backgroundColor: theme.bg, padding: '30px', borderRadius: '24px', boxShadow: darkMode ? '0 10px 25px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.05)', border: `1px solid ${theme.border}`, transition: 'all 0.3s ease' }}>
      <h2 style={{ marginBottom: '25px', color: theme.text, fontWeight: '800' }}>🛠️ Nueva Orden de Servicio</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
        
        {/* BUSCADOR DE CLIENTES EXISTENTES */}
        <div style={{ position: 'relative' }}>
          <label style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>BUSCAR CLIENTE REGISTRADO (Opcional)</label>
          <input 
            type="text" 
            placeholder="🔍 Escribe el nombre del cliente o gremio..." 
            value={filtroCliente}
            onChange={(e) => {
              setFiltroCliente(e.target.value);
              setMostrarSugerencias(true);
              if (clienteSeleccionado) setClienteSeleccionado(null);
            }}
            style={{ ...inputStyle, border: '1px solid #3b82f6' }} 
          />
          {mostrarSugerencias && filtroCliente.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: theme.bg, zIndex: 100, borderRadius: '10px', border: `1px solid ${theme.border}`, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>
              {clientes.filter(c => c.nombre.toLowerCase().includes(filtroCliente.toLowerCase())).map(c => (
                <div key={c.id} style={sugerenciaStyle} onClick={() => seleccionarCliente(c)}>
                  <strong>{c.nombre}</strong> {c.es_gremio ? ' (GREMIO)' : ''} - {c.telefono}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DATOS DEL CLIENTE Y EQUIPO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <input type="text" name="nombre" placeholder="Nombre del Cliente" required value={formData.nombre} onChange={handleChange} style={inputStyle} />
          <input type="text" name="telefono" placeholder="WhatsApp / Teléfono" required value={formData.telefono} onChange={handleChange} style={inputStyle} />
          <input type="text" name="equipo" placeholder="Equipo (Ej: Samsung A54)" required onChange={handleChange} style={inputStyle} />
          <input type="text" name="estadoGeneral" placeholder="Estado (Rayones, golpes...)" onChange={handleChange} style={inputStyle} />
        </div>

        {/* OPCIÓN CUENTA CORRIENTE */}
        {clienteSeleccionado && (
          <div style={{ padding: '15px', backgroundColor: darkMode ? 'rgba(139, 92, 246, 0.1)' : '#f5f3ff', borderRadius: '12px', border: '1px solid #8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '0.9rem' }}>💳 Cliente detectado: {clienteSeleccionado.nombre}</span>
              <p style={{ margin: 0, fontSize: '0.75rem', color: theme.label }}>Saldo actual en CC: ${clienteSeleccionado.saldo_cc.toLocaleString()}</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: theme.text, fontWeight: 'bold', cursor: 'pointer' }}>
              <input type="checkbox" checked={esCC} onChange={(e) => setEsCC(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              ¿Cargar a Cuenta Corriente?
            </label>
          </div>
        )}

        {/* SECCIÓN DE SEGURIDAD */}
        <div style={{ padding: '20px', backgroundColor: darkMode ? 'rgba(251, 191, 36, 0.03)' : '#fffdf5', borderRadius: '15px', border: `1px solid ${darkMode ? 'rgba(251, 191, 36, 0.15)' : '#fef3c7'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#d97706', textTransform: 'uppercase', margin: 0 }}>🔓 Seguridad</p>
                {formData.patronSeguridad && (
                  <span style={{ backgroundColor: '#fbbf24', color: '#000', padding: '2px 8px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: '900' }}>
                    PATRÓN: {formData.patronSeguridad}
                  </span>
                )}
              </div>
              <label style={{ fontSize: '0.75rem', color: theme.label, marginBottom: '5px', display: 'block' }}>PIN / CONTRASEÑA</label>
              <input type="text" name="pinSeguridad" placeholder="Ej: 1234" onChange={handleChange} style={{ ...inputStyle, width: '150px', border: '1px solid #fbbf24' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : '#f1f5f9', padding: '10px', borderRadius: '12px' }}>
              <PatternLock onPatternChange={handlePatternChange} size={130} />
              <span style={{ fontSize: '0.6rem', color: theme.label, marginTop: '5px', fontWeight: 'bold' }}>DIBUJÁ EL PATRÓN</span>
            </div>
          </div>
        </div>

        <textarea name="falla" placeholder="Falla detectada..." required onChange={handleChange} rows={3} style={inputStyle}></textarea>

        {/* SERVICIOS A REALIZAR */}
        <div style={{ padding: '20px', backgroundColor: theme.input, borderRadius: '15px', border: `1px solid ${theme.border}` }}>
          <p style={{ fontWeight: 'bold', marginBottom: '15px', fontSize: '0.9rem', color: '#3b82f6', textTransform: 'uppercase' }}>Servicios a realizar:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            {Object.keys(reparaciones).map((item) => (
              <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', color: theme.label }}>
                <input type="checkbox" name={item} onChange={handleCheckboxChange} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                {item.charAt(0).toUpperCase() + item.slice(1).replace(/([A-Z])/g, ' $1')}
              </label>
            ))}
          </div>
        </div>

        {/* COSTOS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '20px', backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', borderRadius: '15px', border: '1px solid #bfdbfe' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '5px', display: 'block' }}>PRESUPUESTO TOTAL ($)</label>
            <input type="number" name="presupuestoTotal" placeholder="0" onChange={handleChange} style={{...inputStyle, border: '1px solid #3b82f6'}} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '5px', display: 'block' }}>SEÑA ENTREGADA ($)</label>
            <input type="number" name="seña" placeholder="0" onChange={handleChange} style={{...inputStyle, border: '1px solid #3b82f6'}} />
          </div>
        </div>

        <button type="submit" style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '18px', borderRadius: '14px', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}>
          🚀 GENERAR ORDEN DE SERVICIO
        </button>
      </form>
    </div>
  );
}