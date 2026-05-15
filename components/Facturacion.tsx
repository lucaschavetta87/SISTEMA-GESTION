"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../app/supabase';

// --- CONFIGURACIÓN DEL CLIENTE (REEMPLAZAR AQUÍ) ---
const DATOS_EMISOR = {
  nombre: "NOMBRE DE LA EMPRESA",
  cuit: 20000000000, // Solo números para el QR
  cuitFormateado: "20-00000000-0",
  direccion: "DIRECCIÓN COMERCIAL - CIUDAD",
  web: "www.tuweb.com.ar",
  puntoVenta: 1
};

export default function Facturacion({ darkMode = true }: { darkMode?: boolean }) {
  const [form, setForm] = useState({ nombre: '', cuit: '', total: '' });
  const [itemVenta, setItemVenta] = useState(''); 
  const [tipoIva, setTipoIva] = useState('Consumidor Final');
  const [cargando, setCargando] = useState(false);
  const [historial, setHistorial] = useState<any[]>([]);

  const theme = {
    card: darkMode ? '#1e293b' : '#ffffff',
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
      .from('pendientes_facturar')
      .select('*')
      .order('id', { ascending: false })
      .limit(10);
    if (data) setHistorial(data);
  };

  const imprimirTicketFactura = (datos: any) => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;

    // Lógica de QR dinámico basada en los datos del emisor configurados
    const qrData = { 
      ver: 1, 
      fecha: new Date(datos.fecha).toISOString().split('T')[0], 
      cuit: DATOS_EMISOR.cuit, 
      ptoVta: DATOS_EMISOR.puntoVenta, 
      tipoCmp: datos.tipo_comp, 
      nroCmp: datos.nro_comprobante, 
      importe: datos.total, 
      moneda: "PES", 
      ctz: 1, 
      tipoDocRec: datos.cuit.length > 8 ? 80 : 96, 
      nroDocRec: parseInt(datos.cuit), 
      tipoCodAut: "E", 
      codAut: parseInt(datos.cae) 
    };
    
    const qrEncoded = btoa(JSON.stringify(qrData));
    const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${qrEncoded}`;

    ventana.document.write(`
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; } 
            body { font-family: 'Arial', sans-serif; width: 72mm; margin: 0 auto; padding: 5mm; font-size: 11px; color: #000; line-height: 1.3; font-weight: 900; } 
            .text-center { text-align: center; } 
            .divider { border-top: 2px solid #000; margin: 8px 0; } 
            .factura-letra { border: 3px solid #000; padding: 5px 10px; font-size: 24px; display: inline-block; margin-bottom: 5px; font-weight: 900; } 
            .logo { width: 70px; height: 70px; margin-bottom: 5px; }
            .header-info { font-size: 12px; margin-bottom: 2px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <img src="/logo-cliente.png" class="logo" onerror="this.style.display='none'">
            <div style="font-size: 20px; letter-spacing: 1px;">${DATOS_EMISOR.nombre}</div>
            <div class="header-info">CUIT: ${DATOS_EMISOR.cuitFormateado}</div>
            <div class="header-info">${DATOS_EMISOR.direccion}</div>
            <div class="header-info">Fecha: ${new Date(datos.fecha).toLocaleDateString('es-AR')}</div>
            <div style="font-size: 10px; margin-top: 2px;">web: ${DATOS_EMISOR.web}</div>
          </div>
          
          <div class="divider"></div>
          <div class="text-center">
            <div class="factura-letra">${datos.letra}</div>
            <div>FACTURA ELECTRÓNICA</div>
            <div style="font-size: 10px;">Cod. ${datos.tipo_comp || '06'} | Nro: ${datos.nro_comprobante || '00000000'}</div>
          </div>
          <div class="divider"></div>
          
          <div>CLIENTE: ${datos.cliente}</div>
          <div>CUIT/DNI: ${datos.cuit}</div>
          <div class="divider"></div>
          
          ${itemVenta ? `<div>DETALLE: ${itemVenta.toUpperCase()}</div><div class="divider"></div>` : ''}
          
          <div style="display:flex; justify-content:space-between; font-size: 15px; padding: 2px 0;">
            <span>TOTAL:</span> <span>$${datos.total.toLocaleString('es-AR')}</span>
          </div>
          
          <div class="divider"></div>
          <div class="text-center">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}" style="width:130px; height:130px; border: 1px solid #000;"/>
            <div style="font-size: 13px; margin-top:5px;">CAE: ${datos.cae || 'Pnd.'}</div>
            <div class="divider"></div>
            <div style="font-size: 14px; margin-top: 5px;">¡Gracias por su compra!</div>
          </div>
          
          <script>window.onload = function() { window.print(); setTimeout(window.close, 800); };</script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  const facturarARCA = async () => {
    const cuitLimpio = form.cuit.replace(/\D/g, '');
    const mTotal = parseFloat(form.total) || 0;
    if (mTotal <= 0 || !form.cuit) return alert("Faltan datos");
    setCargando(true);
    
    let tipoComp = 6, letra = "B", neto = Math.round((mTotal / 1.21) * 100) / 100, ivaM = Math.round((mTotal - neto) * 100) / 100;
    if (tipoIva.includes("INSCRIPTO")) { tipoComp = 1; letra = "A"; } 
    else if (tipoIva === "IVA EXENTO") { tipoComp = 11; letra = "C"; neto = mTotal; ivaM = 0; }

    const { error } = await supabase.from('pendientes_facturar').insert([{
      cliente: form.nombre.toUpperCase() || 'CONSUMIDOR FINAL', 
      cuit: cuitLimpio, 
      total: mTotal, 
      neto: neto, 
      iva: ivaM, 
      tipo_comp: tipoComp, 
      letra: letra, 
      estado: 'pendiente'
    }]);

    if (!error) {
      alert(`🚀 Solicitud enviada al sistema fiscal.`);
      imprimirTicketFactura({ cliente: form.nombre.toUpperCase(), cuit: cuitLimpio, total: mTotal, letra, fecha: new Date(), tipo_comp: tipoComp });
      setForm({ nombre: '', cuit: '', total: '' });
      setItemVenta('');
      cargarHistorial();
    } else {
      alert("Error: " + error.message);
    }
    setCargando(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '25px', maxWidth: '1100px', margin: '0 auto', padding: '10px' }}>
      <div style={{ padding: '25px', borderRadius: '24px', backgroundColor: theme.card, border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: '0 0 20px 0', color: theme.text, fontSize: '1.3rem', fontWeight: '800' }}>📋 Facturación Fiscal</h2>
        
        <input style={{ ...inputS, backgroundColor: theme.input, color: theme.text, border: `1px solid ${theme.border}` }} placeholder="CUIT / DNI" value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})} />
        <input style={{ ...inputS, backgroundColor: theme.input, color: theme.text, border: `1px solid ${theme.border}` }} placeholder="Nombre Cliente" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
        <input style={{ ...inputS, backgroundColor: theme.input, color: theme.text, border: `1px solid ${theme.border}` }} placeholder="Detalle / Ítem (Solo p/ Ticket)" value={itemVenta} onChange={e => setItemVenta(e.target.value)} />
        
        <select style={{ ...inputS, backgroundColor: theme.input, color: theme.text, border: `1px solid ${theme.border}` }} value={tipoIva} onChange={e => setTipoIva(e.target.value)}>
          <option>Consumidor Final</option>
          <option>IVA RESPONSABLE INSCRIPTO</option>
          <option>IVA EXENTO</option>
        </select>

        <input style={{ ...inputS, backgroundColor: theme.input, border: '2px solid #10b981', color: '#10b981', fontSize: '1.5rem', fontWeight: '900' }} placeholder="0.00" value={form.total} onChange={e => setForm({...form, total: e.target.value})} />

        <button onClick={facturarARCA} disabled={cargando} style={btnFactura}>{cargando ? 'PROCESANDO...' : 'GENERAR FACTURA'}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
           <div style={{ padding: '15px', borderRadius: '24px', backgroundColor: theme.innerBox, border: `1px solid ${theme.border}`, textAlign: 'center' }}>
              <div style={{ color: theme.subtext, fontSize: '0.7rem', fontWeight: 'bold' }}>FACTURADO HOY</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: theme.text }}>${historial.reduce((acc, f) => acc + (f.total || 0), 0).toLocaleString()}</div>
           </div>
           <button onClick={() => cargarHistorial()} style={{ borderRadius: '15px', backgroundColor: '#334155', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🔄 ACTUALIZAR</button>
        </div>

        <div style={{ padding: '25px', borderRadius: '24px', backgroundColor: theme.card, border: `1px solid ${theme.border}`, flex: 1, maxHeight: '400px', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 15px 0', color: theme.text, fontSize: '1rem' }}>Comprobantes Recientes</h3>
          {historial.map(f => (
            <div key={f.id} style={{ padding: '10px', backgroundColor: theme.innerBox, borderRadius: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 'bold', color: theme.text }}>{f.cliente.slice(0, 18)}</div>
                <div style={{ color: f.estado === 'procesado' ? '#10b981' : '#f59e0b' }}>${f.total} - {f.estado}</div>
              </div>
              {f.estado === 'procesado' && <button onClick={() => imprimirTicketFactura(f)} style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>🖨️</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inputS = { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '12px', outline: 'none' };
const btnFactura = { width: '100%', padding: '15px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold' as 'bold', cursor: 'pointer' };