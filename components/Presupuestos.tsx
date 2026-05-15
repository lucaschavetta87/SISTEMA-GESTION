"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../app/supabase';

export default function Presupuestos({ darkMode = true }: { darkMode?: boolean }) {
  const [form, setForm] = useState({
    nombre: '', 
    telefono: '', 
    dni: '', 
    producto: '', 
    marca: '', 
    detalles: '', 
    imei: '', 
    nota: '' 
  });
  
  const [items, setItems] = useState([{ descripcion: '', precio: 0 }, { descripcion: '', precio: 0 }, { descripcion: '', precio: 0 }]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const theme = {
    card: darkMode ? '#1e293b' : '#ffffff',
    bg: darkMode ? '#0f172a' : '#f8fafc',
    text: darkMode ? '#f8fafc' : '#0f172a',
    subtext: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#e2e8f0',
    input: darkMode ? '#0f172a' : '#ffffff',
    innerBox: darkMode ? '#0f172a' : '#f1f5f9'
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    const { data } = await supabase
      .from('presupuestos')
      .select('*')
      .order('id', { ascending: false })
      .limit(20);
    if (data) setHistorial(data);
  };

  // Mantenemos las funciones de impresión exactamente igual
  const imprimirTicket = (datosPresu: any) => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    ventana.document.write(`
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Arial', sans-serif; width: 72mm; margin: 0 auto; padding: 5mm; font-size: 11px; color: #000; line-height: 1.3; font-weight: 900; }
            .text-center { text-align: center; }
            .divider { border-top: 2px solid #000; margin: 8px 0; }
            .logo { width: 50px; height: 50px; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <img src="/logo.png" class="logo" onerror="this.style.display='none'">
            <div style="font-size: 16px;">SISTEMA-GESTION</div>
            <div>Ciudad - Mendoza</div>
            <div>Contacto: 261</div>
          </div>
          <div class="divider"></div>
          <div class="text-center">PRESUPUESTO TÉCNICO</div>
          <div class="divider"></div>
          <div>FECHA: ${new Date(datosPresu.fecha).toLocaleDateString('es-AR')}</div>
          <div>CLIENTE: ${datosPresu.cliente.toUpperCase()}</div>
          <div>DNI/CUIT: ${datosPresu.dni || 'N/C'}</div>
          <div>TEL: ${datosPresu.telefono}</div>
          <div>EQUIPO: ${datosPresu.equipo.toUpperCase()}</div>
          <div class="divider"></div>
          <div class="text-center">-- DETALLE --</div>
          ${(datosPresu.detalle_items || datosPresu.detalle).map((i: any) => `
            <div style="display:flex; justify-content:space-between; margin: 2px 0;">
              <span>* ${i.descripcion.toUpperCase()}</span>
              <span>$${Number(i.precio).toLocaleString('es-AR')}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div style="font-size: 14px; display:flex; justify-content:space-between;">
            <span>TOTAL:</span> <span>$${Number(datosPresu.monto || datosPresu.total).toLocaleString('es-AR')}</span>
          </div>
          ${datosPresu.nota ? `
            <div class="divider"></div>
            <div style="font-size: 10px;">OBSERVACIONES:</div>
            <div style="font-style: italic;">${datosPresu.nota.toUpperCase()}</div>
          ` : ''}
          <div class="divider"></div>
          <div style="font-size: 9px; text-align: center;">
            VALIDEZ: 10 DÍAS CORRIDOS.<br>
            Presupuestos Web:<br>
            www.TUWEB.com.ar
          </div>
          <script>window.onload = function() { window.print(); setTimeout(window.close, 500); };</script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  const generarPDFA4 = (datosPresu: any) => {
    const ventanaA4 = window.open('', '_blank');
    if (!ventanaA4) return;
    ventanaA4.document.write(`
      <html>
        <head>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #000; line-height: 1.4; padding: 0; margin: 0; font-weight: bold; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .logo { width: 80px; height: 80px; }
            .title-box h1 { margin: 0; font-size: 32px; font-weight: 900; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; border: 2px solid #000; padding: 15px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            table th { background: #000; color: #fff; padding: 10px; text-align: left; }
            table td { border: 1px solid #000; padding: 10px; }
            .total-box { text-align: right; font-size: 24px; font-weight: 900; border-top: 2px solid #000; }
            .footer { margin-top: 50px; font-size: 12px; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
            .nota-box { margin-top: 10px; padding: 10px; border: 1px solid #000; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display:flex; align-items:center;">
              <img src="/logo.png" class="logo" onerror="this.style.display='none'">
              <div class="title-box" style="margin-left:15px;">
                <h1>SISTEMA-GESTION</h1>
                <p>SERVICIO TÉCNICO ESPECIALIZADO</p>
              </div>
            </div>
            <div style="text-align:right; font-size:12px;">
              CIUDAD, Mendoza Centro<br>
              Contacto: 261<br>
              www.TUWEB.com.ar
            </div>
          </div>
          <div style="text-align:right; margin-bottom:10px;">PRESUPUESTO N°: ${datosPresu.id} | FECHA: ${new Date(datosPresu.fecha).toLocaleDateString('es-AR')}</div>
          <div class="info-grid">
            <div><b>CLIENTE:</b> ${datosPresu.cliente.toUpperCase()}</div>
            <div><b>DNI/CUIT:</b> ${datosPresu.dni || 'N/C'}</div>
            <div><b>TELÉFONO:</b> ${datosPresu.telefono}</div>
            <div><b>EQUIPO:</b> ${datosPresu.equipo.toUpperCase()}</div>
            <div><b>MODELO:</b> ${datosPresu.modelo?.toUpperCase() || ''}</div>
            <div><b>IMEI/SN:</b> ${datosPresu.imei || 'N/C'}</div>
          </div>
          <table>
            <thead>
              <tr><th>DESCRIPCIÓN DEL SERVICIO</th><th style="text-align:right;">SUBTOTAL</th></tr>
            </thead>
            <tbody>
              ${(datosPresu.detalle_items || datosPresu.detalle).map((i: any) => `
                <tr><td>${i.descripcion.toUpperCase()}</td><td style="text-align:right;">$${Number(i.precio).toLocaleString('es-AR')}</td></tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-box">TOTAL ESTIMADO: $${Number(datosPresu.monto || datosPresu.total).toLocaleString('es-AR')}</div>
          
          ${datosPresu.nota ? `<div class="nota-box"><b>OBSERVACIONES:</b><br>${datosPresu.nota.toUpperCase()}</div>` : ''}

          <div class="footer"><b>ESTE PRESUPUESTO TIENE UNA VALIDEZ DE 10 DÍAS CORRIDOS.</b></div>
          <script>window.onload = function() { window.print(); setTimeout(window.close, 800); };</script>
        </body>
      </html>
    `);
    ventanaA4.document.close();
  };

  const agregarItem = () => setItems([...items, { descripcion: '', precio: 0 }]);

  const actualizarItem = (index: number, campo: string, valor: any) => {
    const nuevosItems = [...items];
    nuevosItems[index] = { ...nuevosItems[index], [campo]: valor };
    setItems(nuevosItems);
  };

  const calcularTotal = (listaItems = items) => listaItems.reduce((acc, item) => acc + (Number(item.precio) || 0), 0);

  const enviarWhatsApp = (datos: any) => {
    const telefono = datos.telefono.replace(/\D/g, '');
    const numeroFinal = telefono.startsWith('54') ? telefono : `549${telefono}`;
    const itemsList = datos.detalle_items || datos.detalle;
    const detalleTexto = itemsList.map((i: any) => `• ${i.descripcion}: *$${Number(i.precio).toLocaleString('es-AR')}*`).join('%0A');
    const mensaje = `*PRESUPUESTO - GESTION*%0A%0A👤 *Cliente:* ${datos.cliente.toUpperCase()}%0A📱 *Equipo:* ${datos.equipo.toUpperCase()}%0A%0A*DETALLE:*%0A${detalleTexto}%0A%0A💰 *TOTAL: $${Number(datos.monto || datos.total).toLocaleString('es-AR')}*%0AValidez: 10 días.`;
    window.open(`https://api.whatsapp.com/send?phone=${numeroFinal}&text=${mensaje}`, '_blank');
  };

  const guardarPresupuesto = async (tipo: 'TICKET' | 'A4') => {
    if (!form.nombre || calcularTotal() === 0) return alert("Faltan datos");
    
    // IMPORTANTE: Adaptamos los nombres a lo que definimos en el SQL de Supabase
    const datosEnvio = {
      fecha: new Date().toISOString(), // Formato ISO para evitar error de rango
      cliente: form.nombre,
      telefono: form.telefono,
      dni: form.dni,
      equipo: `${form.producto} ${form.marca}`,
      modelo: form.detalles,
      imei: form.imei,
      total: calcularTotal(), // Cambiado 'monto' por 'total' para que coincida con SQL
      nota: form.nota,
      detalle: items.filter(i => i.descripcion !== '') // Cambiado 'detalle_items' por 'detalle'
    };

    // Quitamos el ID manual para que Supabase use el SERIAL
    const { data, error } = await supabase.from('presupuestos').insert([datosEnvio]).select();
    
    if (!error && data) {
      if (tipo === 'TICKET') imprimirTicket(data[0]);
      else generarPDFA4(data[0]);
      cargarHistorial();
      setForm({ nombre: '', telefono: '', dni: '', producto: '', marca: '', detalles: '', imei: '', nota: '' });
      setItems([{ descripcion: '', precio: 0 }, { descripcion: '', precio: 0 }, { descripcion: '', precio: 0 }]);
    } else {
        alert("Error al guardar presupuesto: " + (error?.message || "Error desconocido"));
    }
  };

  const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.input, color: theme.text, marginBottom: '10px', outline: 'none' };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: theme.card, padding: '30px', borderRadius: '24px', border: `1px solid ${theme.border}`, transition: '0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
        <h2 style={{ color: theme.text, margin: 0 }}>📄 PRESUPUESTOS</h2>
        <button onClick={() => setMostrarHistorial(!mostrarHistorial)} style={{ padding: '10px 20px', borderRadius: '12px', backgroundColor: mostrarHistorial ? '#3b82f6' : theme.innerBox, color: theme.text, border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          {mostrarHistorial ? '← Formulario' : '🕒 Historial'}
        </button>
      </div>

      {!mostrarHistorial ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input style={inputStyle} placeholder="Nombre del Cliente" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
            <input style={inputStyle} placeholder="WhatsApp" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input style={inputStyle} placeholder="DNI / CUIT del Cliente" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} />
            <input style={inputStyle} placeholder="IMEI / Número de Serie" value={form.imei} onChange={e => setForm({...form, imei: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <input style={inputStyle} placeholder="Producto" value={form.producto} onChange={e => setForm({...form, producto: e.target.value})} />
            <input style={inputStyle} placeholder="Marca" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} />
            <input style={inputStyle} placeholder="Modelo" value={form.detalles} onChange={e => setForm({...form, detalles: e.target.value})} />
          </div>
          <h4 style={{ color: '#3b82f6', marginBottom: '10px' }}>Detalle de Reparación</h4>
          {items.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
              <input style={{...inputStyle, flex: 3}} placeholder="Descripción" value={item.descripcion} onChange={e => actualizarItem(index, 'descripcion', e.target.value)} />
              <input style={{...inputStyle, flex: 1}} type="number" placeholder="$" value={item.precio || ''} onChange={e => actualizarItem(index, 'precio', e.target.value)} />
            </div>
          ))}
          <button onClick={agregarItem} style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#3b82f6', border: '1px dashed #3b82f6', borderRadius: '10px', cursor: 'pointer', marginBottom: '20px' }}>+ ÍTEM</button>
          
          <h4 style={{ color: theme.subtext, marginBottom: '10px', fontSize: '0.9rem' }}>Observaciones / Notas Extra</h4>
          <textarea 
            style={{ ...inputStyle, height: '80px', resize: 'none', fontFamily: 'inherit' }} 
            placeholder="Escribe detalles adicionales aquí..." 
            value={form.nota} 
            onChange={e => setForm({...form, nota: e.target.value})} 
          />

          <div style={{ backgroundColor: theme.innerBox, padding: '20px', borderRadius: '15px', textAlign: 'center', fontSize: '24px', fontWeight: '900', color: '#10b981', border: `1px solid ${theme.border}` }}>
            TOTAL: ${calcularTotal().toLocaleString('es-AR')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
            <button onClick={() => guardarPresupuesto('TICKET')} style={{ padding: '18px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>🖨️ TICKET (80mm)</button>
            <button onClick={() => guardarPresupuesto('A4')} style={{ padding: '18px', backgroundColor: '#8e44ad', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>📄 PDF (A4)</button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {historial.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', backgroundColor: theme.innerBox, borderRadius: '15px', border: `1px solid ${theme.border}` }}>
              <div>
                <div style={{ fontWeight: 'bold', color: theme.text }}>{p.cliente} - ${Number(p.total || p.monto).toLocaleString()}</div>
                <div style={{ fontSize: '0.8rem', color: theme.subtext }}>{new Date(p.fecha).toLocaleDateString('es-AR')} | {p.equipo}</div>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => enviarWhatsApp(p)} style={{ padding: '8px', backgroundColor: '#25d366', color: '#fff', border: 'none', borderRadius: '8px' }}>📱</button>
                <button onClick={() => imprimirTicket(p)} style={{ padding: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px' }}>🖨️</button>
                <button onClick={() => generarPDFA4(p)} style={{ padding: '8px', backgroundColor: '#8e44ad', color: '#fff', border: 'none', borderRadius: '8px' }}>📄</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}