"use client";
import React, { useState, useRef } from 'react';
import { supabase } from '../app/supabase';

export default function Stock({ stock, setStock, darkMode = true }: any) {
  const [form, setForm] = useState({ id: '', codigo: '', nombre: '', cantidad: '', precio: '', imagen_url: '' });
  const [editando, setEditando] = useState(false);
  const [imagenArchivo, setImagenArchivo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CONFIGURACIÓN DE COLORES DINÁMICOS ---
  const theme = {
    card: darkMode ? '#1e293b' : '#ffffff',
    bg: darkMode ? '#0f172a' : '#f8fafc',
    text: darkMode ? '#f8fafc' : '#0f172a',
    subtext: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#e2e8f0',
    input: darkMode ? '#0f172a' : '#ffffff',
    rowBorder: darkMode ? '#0f172a' : '#f1f5f9'
  };

  const inputStyle: React.CSSProperties = { 
    padding: '12px', 
    borderRadius: '10px', 
    border: `1px solid ${theme.border}`, 
    backgroundColor: theme.input, 
    color: theme.text,
    outline: 'none', 
    fontSize: '14px',
    transition: 'all 0.3s ease'
  };

  const btnBaseStyle: React.CSSProperties = { 
    padding: '10px 20px', 
    color: 'white', 
    border: 'none', 
    borderRadius: '10px', 
    fontWeight: 'bold', 
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const actionBtnStyle = (color: string): React.CSSProperties => ({ 
    background: darkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9', 
    border: `1px solid ${color}`, 
    borderRadius: '8px', 
    color: color, 
    cursor: 'pointer', 
    padding: '6px 10px' 
  });

  // --- LOGICA AUXILIAR PARA SUBIR LA IMAGEN ---
  const subirImagen = async (archivo: File): Promise<string | null> => {
    try {
      const nombreArchivo = `${Date.now()}_${archivo.name.replace(/\s+/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('imagenes_stock')
        .upload(nombreArchivo, archivo);

      if (error) throw error;

      // Obtenemos la URL pública del archivo subido
      const { data: publicUrlData } = supabase.storage
        .from('imagenes_stock')
        .getPublicUrl(nombreArchivo);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error("Error al subir imagen:", err);
      return null;
    }
  };

  // --- LOGICA DE GUARDADO ---
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let urlDeFoto = form.imagen_url;

    // Si el usuario seleccionó un archivo nuevo, lo subimos primero
    if (imagenArchivo) {
      const urlSubida = await subirImagen(imagenArchivo);
      if (urlSubida) urlDeFoto = urlSubida;
    }

    const datosProcesados = {
      codigo: form.codigo,
      nombre: form.nombre,
      cantidad: Number(form.cantidad),
      precio_venta: Number(form.precio),
      imagen_url: urlDeFoto, 
      updated_at: new Date().toISOString()
    };

    if (editando) {
      const { error } = await supabase
        .from('stock')
        .update(datosProcesados)
        .eq('id', form.id);

      if (!error) {
        setStock(stock.map((item: any) => 
          item.id === form.id ? { ...item, ...datosProcesados, precio: datosProcesados.precio_venta } : item
        ));
        setEditando(false);
        setForm({ id: '', codigo: '', nombre: '', cantidad: '', precio: '', imagen_url: '' });
        setImagenArchivo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        console.error("Error al actualizar:", error.message);
      }
    } else {
      const { data, error } = await supabase
        .from('stock')
        .insert([datosProcesados])
        .select();

      if (!error && data) {
        const nuevoItem = { ...data[0], precio: data[0].precio_venta };
        setStock([...stock, nuevoItem]);
        setForm({ id: '', codigo: '', nombre: '', cantidad: '', precio: '', imagen_url: '' });
        setImagenArchivo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        console.error("Error al guardar:", error?.message);
      }
    }
  };

  const borrarItem = async (id: string) => {
    if (window.confirm("¿Seguro que querés eliminar este artículo?")) {
      const { error } = await supabase.from('stock').delete().eq('id', id);
      if (!error) setStock(stock.filter((item: any) => item.id !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* FORMULARIO DE CARGA */}
      <div style={{ 
        border: editando ? '2px solid #ed8936' : `1px solid ${theme.border}`, 
        padding: '25px', 
        borderRadius: '24px', 
        backgroundColor: theme.card,
        boxShadow: darkMode ? '0 10px 15px -3px rgba(0, 0, 0, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease'
      }}>
        <h3 style={{ color: editando ? '#ed8936' : '#3b82f6', marginBottom: '20px', fontWeight: '800' }}>
          {editando ? '✏️ EDITANDO EN LA NUBE' : '➕ NUEVO REPUESTO / ARTÍCULO'}
        </h3>
        <form onSubmit={guardar} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Código" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} style={inputStyle} />
          <input type="text" placeholder="Nombre del Producto" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required style={{...inputStyle, flex: 1, minWidth: '200px'}} />
          <input type="number" placeholder="Stock" value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} required style={{...inputStyle, width: '90px'}} />
          <input type="number" placeholder="Precio $" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} required style={inputStyle} />
          
          {/* CUADRO PARA SELECCIONAR IMAGEN */}
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef}
            onChange={e => setImagenArchivo(e.target.files ? e.target.files[0] : null)} 
            style={{ ...inputStyle, width: '220px', fontSize: '12px', padding: '8px' }} 
          />

          <button type="submit" style={{ ...btnBaseStyle, backgroundColor: editando ? '#ed8936' : '#3b82f6' }}>
            {editando ? 'ACTUALIZAR' : 'GUARDAR'}
          </button>
          {editando && (
            <button type="button" onClick={() => {setEditando(false); setForm({id:'', codigo:'', nombre:'', cantidad:'', precio:'', imagen_url:''}); setImagenArchivo(null); if (fileInputRef.current) fileInputRef.current.value = '';}} style={{ ...btnBaseStyle, backgroundColor: '#475569' }}>
              CANCELAR
            </button>
          )}
        </form>
      </div>

      {/* TABLA DE STOCK */}
      <div style={{ 
        backgroundColor: theme.card, 
        padding: '25px', 
        borderRadius: '24px', 
        border: `1px solid ${theme.border}`,
        boxShadow: darkMode ? '0 4px 6px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}`, textAlign: 'left', fontSize: '0.75rem', color: theme.subtext }}>
              <th style={{ padding: '15px' }}>CÓDIGO</th>
              <th>PRODUCTO</th>
              <th>CANTIDAD</th>
              <th>PRECIO UNIT.</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${theme.rowBorder}` }}>
                <td style={{ padding: '15px', fontFamily: 'monospace', color: theme.subtext }}>{item.codigo || '---'}</td>
                <td style={{ color: theme.text, fontWeight: '600' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* MINIATURA DE LA IMAGEN O MARCADOR GENÉRICO */}
                    {item.imagen_url ? (
                      <img src={item.imagen_url} alt={item.nombre} style={{ width: '35px', height: '35px', borderRadius: '8px', objectFit: 'cover', border: `1px solid ${theme.border}` }} />
                    ) : (
                      <div style={{ width: '35px', height: '35px', borderRadius: '8px', backgroundColor: darkMode ? '#334155' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📦</div>
                    )}
                    {item.nombre}
                  </div>
                </td>
                <td>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '8px', 
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    backgroundColor: item.cantidad < 3 ? (darkMode ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2') : (darkMode ? 'rgba(16, 185, 129, 0.1)' : '#dcfce7'),
                    color: item.cantidad < 3 ? '#f87171' : '#10b981'
                  }}>
                    {item.cantidad} u.
                  </span>
                </td>
                <td style={{ color: theme.text, fontWeight: '700' }}>${Number(item.precio_venta || item.precio).toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => {setForm({ ...item, precio: item.precio_venta || item.precio, imagen_url: item.imagen_url || '' }); setEditando(true);}} style={actionBtnStyle('#3b82f6')}>✏️</button>
                    <button onClick={() => borrarItem(item.id)} style={actionBtnStyle('#ef4444')}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}