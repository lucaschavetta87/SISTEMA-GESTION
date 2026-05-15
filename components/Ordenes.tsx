"use client";
import React, { useState } from 'react';
import { supabase } from '../app/supabase';

interface OrdenesProps {
  ordenes: any[];
  setOrdenes: any;
  stock: any[];
  setStock: any;
  darkMode?: boolean;
}

export default function Ordenes({ ordenes, setOrdenes, stock, setStock, darkMode = true }: OrdenesProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nuevoPrecio, setNuevoPrecio] = useState<string>("");

  const theme = {
    cardBg: darkMode ? '#1e293b' : '#ffffff',
    textMain: darkMode ? '#f8fafc' : '#0f172a',
    textSub: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#e2e8f0',
    innerBox: darkMode ? '#0f172a' : '#f8fafc',
    divider: darkMode ? '#334155' : '#f1f5f9'
  };

  const condicionesLegales = `
    <div style="font-size: 9px; margin-top: 10px; text-align: center; line-height: 1.2; color: #000; width: 100%; border-top: 1px dashed #000; padding-top: 8px; font-weight: 900;">
      El local no se hace cargo por daños previos no expresados. 90 días sin retirar se considera abandono (Art. 1947 CCCN).
    </div>
  `;

  const footerWeb = `
    <div style="margin-top: 10px; text-align: center; border: 1px solid #000; padding: 5px; font-size: 10px; font-weight: 900;">
      CONSULTÁ EL ESTADO DE TU EQUIPO EN:<br>
      www.sitioweb.com
    </div>
  `;

  const guardarNuevoPrecio = async (orden: any) => {
    const nuevoTotal = parseFloat(nuevoPrecio);
    if (isNaN(nuevoTotal)) return;
    const nuevoSaldo = nuevoTotal - (orden.seña || 0);
    const { error } = await supabase
      .from('ordenes')
      .update({ presupuestoTotal: nuevoTotal, saldo: nuevoSaldo })
      .eq('id', orden.id);

    if (!error) {
      setOrdenes(ordenes.map(o => o.id === orden.id ? { ...o, presupuestoTotal: nuevoTotal, saldo: nuevoSaldo } : o));
      setEditingId(null);
      setNuevoPrecio("");
    }
  };

  const borrarOrden = async (id: any) => {
    if (window.confirm("¿Seguro que querés eliminar esta orden? No se puede deshacer.")) {
      const { error } = await supabase.from('ordenes').delete().eq('id', id);
      if (!error) {
        setOrdenes(ordenes.filter(o => o.id !== id));
      } else {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  const enviarWhatsappListo = (orden: any) => {
    if (!orden.telefono) return;
    const telefono = orden.telefono.replace(/\D/g, ''); 
    const numeroFinal = telefono.startsWith('54') ? telefono : `549${telefono}`;
    const mensaje = `Hola *${orden.nombre}*, te informamos de *Servicio Tecnico* 📱 que tu equipo *${orden.equipo}* ya está listo. ¡Te esperamos!`;
    window.open(`https://api.whatsapp.com/send?phone=${numeroFinal}&text=${mensaje}`, '_blank');
  };

  const actualizarEstado = async (id: any, nuevoEstado: string, ordenCompleta: any) => {
    const fechaEntrega = nuevoEstado === 'Entregado' ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('ordenes')
      .update({ estado_orden: nuevoEstado, fecha_entrega: fechaEntrega })
      .eq('id', id);
      
    if (!error) {
      setOrdenes(ordenes.map(o => o.id === id ? { ...o, estado_orden: nuevoEstado, fecha_entrega: fechaEntrega } : o));
      if (nuevoEstado === 'Listo' && ordenCompleta.telefono) enviarWhatsappListo(ordenCompleta);
    }
  };

  const imprimirGarantia = (orden: any) => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    const hoy = new Date();
    const vencimiento = new Date();
    vencimiento.setDate(hoy.getDate() + 30);
    ventana.document.write(`
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Arial', sans-serif; width: 72mm; margin: 0 auto; padding: 5mm; font-size: 12px; line-height: 1.3; color: #000; font-weight: 900; }
            .text-center { text-align: center; width: 100%; }
            .divider { border-top: 2px solid #000; margin: 8px 0; width: 100%; }
            .logo { width: 50px; height: 50px; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <img src="/logo.png" class="logo" onerror="this.style.display='none'">
            <div style="font-size: 18px;">SISTEMA-GESTION</div>
            <div>Ciudad - Mendoza</div>
            <div>TEL: 261</div>
          </div>
          <div class="divider"></div>
          <div class="text-center">COMPROBANTE DE RETIRO / GARANTÍA</div>
          <div class="divider"></div>
          <div>ORDEN: #${orden.id.toString().slice(-6)}</div>
          <div>CLIENTE: ${orden.nombre.toUpperCase()}</div>
          <div>TEL: ${orden.telefono}</div>
          <div>EQUIPO: ${orden.equipo.toUpperCase()}</div>
          <div class="divider"></div>
          <div style="display:flex; justify-content:space-between"><span>TOTAL:</span> <span>$${orden.presupuestoTotal}</span></div>
          <div style="display:flex; justify-content:space-between"><span>ABONADO:</span> <span>$${orden.presupuestoTotal}</span></div>
          <div class="divider"></div>
          <div class="text-center">GARANTÍA HASTA: ${vencimiento.toLocaleDateString('es-AR')}</div>
          ${condicionesLegales}
          ${footerWeb}
          <script>window.onload = function() { window.print(); setTimeout(window.close, 500); };</script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  const imprimirTicket = (orden: any, esCopiaLocal: boolean = false) => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    const titulo = esCopiaLocal ? "COPIA LOCAL (FIRMAR)" : "COMPROBANTE CLIENTE";
    ventana.document.write(`
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Arial', sans-serif; width: 72mm; margin: 0 auto; padding: 5mm; font-size: 12px; line-height: 1.3; color: #000; font-weight: 900; }
            .text-center { text-align: center; width: 100%; }
            .divider { border-top: 2px solid #000; margin: 8px 0; }
            .logo { width: 50px; height: 50px; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <img src="/logo.png" class="logo" onerror="this.style.display='none'">
            <div style="font-size: 20px;">SISTEMA-GESTION</div>
            <div>Ciudad - Mendoza</div>
            <div>Contacto: 261 </div>
            <div>Fecha: ${new Date(orden.fecha).toLocaleDateString('es-AR')}</div>
          </div>
          <div class="divider"></div>
          <div class="text-center">${titulo}</div>
          <div class="divider"></div>
          <div>ORDEN: #${orden.id.toString().slice(-6)}</div>
          <div>CLIENTE: ${orden.nombre.toUpperCase()}</div>
          <div>TEL: ${orden.telefono}</div>
          <div>EQUIPO: ${orden.equipo.toUpperCase()}</div>
          <div>FALLA: ${orden.falla.toUpperCase()}</div>
          <div class="divider"></div>
          <div style="display:flex; justify-content:space-between"><span>TOTAL:</span> <span>$${orden.presupuestoTotal}</span></div>
          <div style="display:flex; justify-content:space-between"><span>SEÑA:</span> <span>$${orden.seña || 0}</span></div>
          <div style="display:flex; justify-content:space-between"><span>RESTANTE:</span> <span>$${orden.saldo}</span></div>
          ${esCopiaLocal ? '<br><br><div style="border-top:1px solid #000; text-align:center;">FIRMA CLIENTE</div>' : ''}
          ${condicionesLegales}
          ${footerWeb}
          <script>window.onload = function() { window.print(); setTimeout(window.close, 500); };</script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', padding: '10px', alignItems: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1100px' }}>
        <h2 style={{ color: theme.textMain, fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Órdenes de Servicio</h2>
        <span style={{ fontSize: '0.8rem', backgroundColor: theme.innerBox, padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', color: theme.textSub, border: `1px solid ${theme.border}` }}>
          {ordenes.length} TOTAL
        </span>
      </div>
      
      {ordenes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: theme.cardBg, borderRadius: '24px', color: theme.textSub, border: `2px dashed ${theme.border}`, width: '100%', maxWidth: '1100px' }}>No hay órdenes cargadas.</div>
      ) : (
        <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {ordenes.map((orden) => (
            <div key={orden.id} style={{ backgroundColor: theme.cardBg, borderRadius: '20px', padding: '24px', boxShadow: darkMode ? '0 4px 15px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)', border: `1px solid ${theme.border}`, display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '20px', alignItems: 'center', position: 'relative', transition: 'all 0.3s ease' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: theme.textMain }}>{orden.nombre}</div>
                    {orden.es_cuenta_corriente && <span style={{ backgroundColor: '#8b5cf6', color: '#fff', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '6px', fontWeight: '900' }}>CUENTA CTE</span>}
                </div>
                <div style={{ color: '#3b82f6', fontWeight: '700', fontSize: '0.9rem' }}>📞 {orden.telefono}</div>
                <div style={{ marginTop: '8px', fontSize: '0.95rem', color: theme.textMain }}>📱 <strong>{orden.equipo}</strong></div>
                <div style={{ fontSize: '0.75rem', color: theme.textSub, marginTop: '4px' }}>INGRESÓ: {new Date(orden.fecha).toLocaleDateString('es-AR')}</div>
                
                <button 
                  onClick={() => setExpandedId(expandedId === orden.id ? null : orden.id)}
                  style={{ marginTop: '10px', backgroundColor: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '8px', padding: '4px 10px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold', width: 'fit-content' }}
                >
                  {expandedId === orden.id ? '🔼 MENOS INFO' : '🔽 MÁS INFO / TAREAS'}
                </button>

                {expandedId === orden.id && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: theme.innerBox, borderRadius: '10px', border: `1px solid ${darkMode ? '#fbbf2433' : '#fde68a'}` }}>
                    <div style={{ fontSize: '0.75rem', color: darkMode ? '#fbbf24' : '#b45309' }}><strong>PIN:</strong> {orden.pinSeguridad || 'N/A'}</div>
                    <div style={{ fontSize: '0.75rem', color: darkMode ? '#fbbf24' : '#b45309', marginTop: '5px' }}><strong>PATRÓN:</strong> {orden.patronSeguridad || 'N/A'}</div>
                  </div>
                )}
              </div>

              <div style={{ borderLeft: `1px solid ${theme.divider}`, borderRight: `1px solid ${theme.divider}`, padding: '0 25px' }}>
                <div style={{ fontSize: '0.7rem', color: theme.textSub, fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>Falla Reportada</div>
                <div style={{ fontSize: '0.9rem', color: theme.textMain, fontWeight: '500', marginBottom: '15px' }}>{orden.falla}</div>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {orden.estado_orden === 'Entregado' ? (
                    <button onClick={() => imprimirGarantia(orden)} style={{ width: '100%', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>📜 IMPRIMIR GARANTÍA</button>
                  ) : (
                    <>
                      <button onClick={() => imprimirTicket(orden, false)} style={{ backgroundColor: darkMode ? '#334155' : '#e2e8f0', color: theme.textMain, border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', flex: 1 }}>🖨️ Ticket</button>
                      <button onClick={() => imprimirTicket(orden, true)} style={{ backgroundColor: darkMode ? '#334155' : '#e2e8f0', color: theme.textMain, border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', flex: 1 }}>📝 Copia</button>
                    </>
                  )}
                  <button onClick={() => borrarOrden(orden.id)} style={{ backgroundColor: 'rgba(225, 29, 72, 0.1)', color: '#fb7185', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', flex: 1 }}>🗑️</button>
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <span style={{ 
                    backgroundColor: orden.estado_orden === 'Entregado' ? 'rgba(37, 99, 235, 0.15)' : orden.estado_orden === 'Listo' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(217, 119, 6, 0.15)', 
                    color: orden.estado_orden === 'Entregado' ? '#3b82f6' : orden.estado_orden === 'Listo' ? '#16a34a' : '#d97706', 
                    padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800', border: '1px solid'
                  }}>
                    {(orden.estado_orden || 'PENDIENTE').toUpperCase()}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => actualizarEstado(orden.id, 'Entregado', orden)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}>🤝 ENTREGAR</button>
                    <button onClick={() => actualizarEstado(orden.id, 'Listo', orden)} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}>✅ LISTO</button>
                    <button onClick={() => actualizarEstado(orden.id, 'Pendiente', orden)} style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}>⏳ PEND.</button>
                  </div>
                </div>

                <div style={{ 
                    backgroundColor: theme.innerBox, 
                    padding: '12px 15px', borderRadius: '15px', border: `1px solid ${theme.border}`, 
                    minWidth: '200px', textAlign: 'center'
                }}>
                  {editingId === orden.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <input 
                        type="number" 
                        value={nuevoPrecio} 
                        onChange={(e) => setNuevoPrecio(e.target.value)}
                        placeholder="Nuevo Total"
                        autoFocus
                        style={{ width: '100%', padding: '5px', borderRadius: '5px', border: `1px solid ${theme.border}`, textAlign: 'center', fontWeight: 'bold', backgroundColor: theme.cardBg, color: theme.textMain }}
                      />
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => guardarNuevoPrecio(orden)} style={{ flex: 1, backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '5px', padding: '5px', cursor: 'pointer', fontSize: '0.7rem' }}>💾</button>
                        <button onClick={() => setEditingId(null)} style={{ flex: 1, backgroundColor: '#f43f5e', color: 'white', border: 'none', borderRadius: '5px', padding: '5px', cursor: 'pointer', fontSize: '0.7rem' }}>✖</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ color: '#f43f5e', fontWeight: '900', fontSize: '1.4rem', lineHeight: '1' }}>
                        $ {orden.saldo}
                        <button 
                          onClick={() => { setEditingId(orden.id); setNuevoPrecio(orden.presupuestoTotal); }}
                          style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: theme.textSub }}
                        >
                          ✏️
                        </button>
                      </div>
                      <div style={{ color: theme.textSub, fontSize: '0.6rem', fontWeight: 'bold', marginTop: '4px', textTransform: 'uppercase' }}>
                        {orden.es_cuenta_corriente ? 'SALDO CC' : `RESTANTE DE $${orden.presupuestoTotal}`}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}