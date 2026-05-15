"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { supabase } from "./supabase";
import Navbar from "../components/Navbar";
import Servicio from "../components/Servicio";
import Ordenes from "../components/Ordenes";
import Stock from "../components/GestionStock";
import Ventas from "../components/Ventas";
import Presupuestos from "../components/Presupuestos";
import Facturacion from "../components/Facturacion";
import ClientesCC from "../components/ClientesCC";

// =======================
// Tipos e Interfaces
// =======================

interface Orden {
  id: number;
  nombre: string;
  telefono?: string;
  equipo?: string;
  falla?: string;
  reparaciones?: string;
  seña?: number | string | null;
  saldo?: number | string | null;
  fecha?: string | null;
  fecha_entrega?: string | null;
  presupuesto_total?: number | null;
  estado_orden: string | null;
  cliente_id?: number | null;
  es_cuenta_corriente?: boolean;
}

interface Venta {
  id: number;
  fecha?: string | null;
  total?: number | string | null;
}

interface StockItem {
  id: number;
  nombre: string;
  cantidad: number;
  [key: string]: any;
}

type TabKey = "inicio" | "servicio" | "ordenes" | "stock" | "ventas" | "clientes" | "presupuestos" | "facturacion";

// =======================
// Configuración y Temas
// =======================

const APP_TITLE = "SISTEMA DE GESTION";

const buildTheme = (darkMode: boolean) => ({
  bg: darkMode ? "#0f172a" : "#F9FAFB",
  sidebar: darkMode ? "#1e293b" : "#6366F1",
  card: darkMode ? "#1e293b" : "#FFFFFF",
  text: darkMode ? "#f8fafc" : "#111827",
  subtext: darkMode ? "#94a3b8" : "#6B7280",
  accent: "#8B5CF6",
  border: "transparent",
  shadow: "0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.02)"
});

const ControlCelApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("inicio");
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);

  const theme = buildTheme(darkMode);
  const hoy = new Date().toLocaleDateString("es-AR");

  // =======================
  // Carga de Datos
  // =======================

  useEffect(() => {
    if (isAuthenticated) cargarDatos();
  }, [isAuthenticated]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [sRes, oRes, vRes] = await Promise.all([
        supabase.from("stock").select("*").order("nombre", { ascending: true }),
        supabase.from("ordenes").select("*").order("id", { ascending: false }),
        supabase.from("ventas").select("*").order("id", { ascending: false })
      ]);

      if (sRes.data) setStock(sRes.data as StockItem[]);
      if (oRes.data) setOrdenes(oRes.data as Orden[]);
      if (vRes.data) setVentas(vRes.data as Venta[]);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // =======================
  // Lógica de Negocio
  // =======================

  const datosGraficoVentas = useMemo(() => {
    const ultimos7Dias = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString("es-AR");
    }).reverse();

    return ultimos7Dias.map((fecha) => {
      const vDia = ventas.filter(v => v.fecha?.includes(fecha)).reduce((acc, v) => acc + (Number(v.total) || 0), 0);
      const señasDia = ordenes.filter(o => o.fecha?.includes(fecha)).reduce((acc, o) => acc + (Number(o.seña) || 0), 0);
      const saldosDia = ordenes.filter(o => o.estado_orden === "Entregado" && o.fecha_entrega?.includes(fecha)).reduce((acc, o) => acc + (Number(o.saldo) || 0), 0);
      return {
        fecha: fecha.split("/")[0] + "/" + fecha.split("/")[1],
        total: vDia + señasDia + saldosDia
      };
    });
  }, [ventas, ordenes]);

  const totalVentasCaja = useMemo(() => {
    const vDia = ventas.filter(v => v.fecha?.includes(hoy)).reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    const sDia = ordenes.filter(o => o.fecha?.includes(hoy)).reduce((acc, o) => acc + (Number(o.seña) || 0), 0);
    const saldosDia = ordenes.filter(o => o.estado_orden === "Entregado" && o.fecha_entrega?.includes(hoy)).reduce((acc, o) => acc + (Number(o.saldo) || 0), 0);
    return vDia + sDia + saldosDia;
  }, [ventas, ordenes, hoy]);

  const totalPorCobrar = useMemo(() => 
    ordenes.filter(o => o.estado_orden !== "Entregado").reduce((acc, o) => acc + (Number(o.saldo) || 0), 0)
  , [ordenes]);

  const guardarOrden = async (nueva: any) => {
    try {
      setLoading(true); // Mostramos carga para asegurar sincronización
      
      const ordenLimpia = {
        id: nueva.id || Date.now(),
        fecha: nueva.fecha,
        nombre: nueva.nombre,
        telefono: nueva.telefono,
        equipo: nueva.equipo || `${nueva.producto} ${nueva.marca}`,
        falla: nueva.falla || "",
        reparaciones: nueva.reparaciones || "",
        seña: Number(nueva.seña) || 0,
        saldo: Number(nueva.saldo) || 0,
        estado_general: nueva.estado_general || nueva.estadoGeneral || "",
        presupuesto_total: Number(nueva.presupuesto_total) || Number(nueva.presupuestoTotal) || 0,
        pinSeguridad: nueva.pinSeguridad || "",
        patronSeguridad: nueva.patronSeguridad || "",
        estado_orden: "Pendiente",
        cliente_id: nueva.cliente_id || null,
        es_cuenta_corriente: nueva.es_cuenta_corriente || false
      };

      // 1. Insertar la orden
      const { error: errorOrden } = await supabase.from("ordenes").insert([ordenLimpia]);
      if (errorOrden) throw errorOrden;

      // 2. Si es CC, actualizar saldo del cliente con lógica de suma forzada
      if (ordenLimpia.es_cuenta_corriente && ordenLimpia.cliente_id) {
        // Traemos el saldo actual directo de la nube para evitar errores de caché
        const { data: clienteActual } = await supabase
          .from('clientes')
          .select('saldo_cc')
          .eq('id', ordenLimpia.cliente_id)
          .single();

        const saldoExistente = Number(clienteActual?.saldo_cc) || 0;
        const nuevoSaldo = saldoExistente + ordenLimpia.saldo;

        const { error: errorCC } = await supabase
          .from('clientes')
          .update({ saldo_cc: nuevoSaldo })
          .eq('id', ordenLimpia.cliente_id);
          
        if (errorCC) console.error("Error actualizando saldo CC:", errorCC.message);
      }

      // 3. Recargar todos los datos globales antes de cambiar de pestaña
      await cargarDatos();
      
      alert("✅ Orden guardada y saldo de Cliente actualizado.");
      setActiveTab("ordenes"); // Te mando a órdenes para refrescar la vista
      
    } catch (error: any) {
      console.error("Error en proceso de guardado:", error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === "gestion" && pass === "gestion1234") setIsAuthenticated(true);
    else alert("Usuario o contraseña incorrectos");
  };

  // =======================
  // Renderizado
  // =======================

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#6366F1", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "sans-serif" }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: "#FFFFFF", padding: "40px", borderRadius: "24px", width: "100%", maxWidth: "380px", textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
          <h1 style={{ fontWeight: 900, color: "#111827", marginBottom: "24px", fontSize: "1.8rem" }}>SISTEMA<span style={{ color: "#6366F1" }}>-GESTION</span></h1>
          <input type="text" placeholder="Usuario" value={user} onChange={(e) => setUser(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", border: "1px solid #E5E7EB", outline: "none" }} />
          <input type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "10px", border: "1px solid #E5E7EB", outline: "none" }} />
          <button type="submit" style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", backgroundColor: "#6366F1", color: "#FFFFFF", fontWeight: 600, cursor: "pointer" }}>Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: theme.bg, color: theme.text, fontFamily: "'Inter', sans-serif" }}>
      <aside style={{ width: "260px", backgroundColor: theme.sidebar, padding: "32px 18px", display: "flex", flexDirection: "column", gap: "24px", flexShrink: 0 }}>
        <h2 style={{ color: "#FFFFFF", fontWeight: 800, margin: "0 0 16px 14px", fontSize: "1.3rem" }}>{APP_TITLE}</h2>
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} darkMode={darkMode} setDarkMode={setDarkMode} />
      </aside>

      <main style={{ flexGrow: 1, padding: "40px 52px", overflowY: "auto" }}>
        <div style={{ maxWidth: "1360px", margin: "0 auto" }}>
          {activeTab === "inicio" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              <header>
                <h1 style={{ fontSize: "2.2rem", fontWeight: 800, margin: 0 }}>Overview</h1>
                <p style={{ color: theme.subtext }}>Bienvenido, Resumen de actividad.</p>
              </header>

              <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
                <div style={{ backgroundColor: theme.card, padding: "24px", borderRadius: "20px", boxShadow: theme.shadow }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ color: theme.subtext, fontWeight: 600, fontSize: "0.9rem" }}>Caja de hoy</span>
                    <div style={{ backgroundColor: "#EDE9FE", padding: "6px 8px", borderRadius: "10px", color: "#8B5CF6" }}>💵</div>
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: 800 }}>${totalVentasCaja.toLocaleString("es-AR")}</div>
                </div>

                <div style={{ backgroundColor: theme.card, padding: "24px", borderRadius: "20px", boxShadow: theme.shadow }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ color: theme.subtext, fontWeight: 600, fontSize: "0.9rem" }}>Equipos en taller</span>
                    <div style={{ backgroundColor: "#DBEAFE", padding: "6px 8px", borderRadius: "10px", color: "#3B82F6" }}>📱</div>
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: 800 }}>{ordenes.filter(o => o.estado_orden !== "Entregado").length}</div>
                </div>

                <div style={{ backgroundColor: theme.card, padding: "24px", borderRadius: "20px", boxShadow: theme.shadow }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ color: theme.subtext, fontWeight: 600, fontSize: "0.9rem" }}>Deuda CC</span>
                    <div style={{ backgroundColor: "#FEE2E2", padding: "6px 8px", borderRadius: "10px", color: "#EF4444" }}>⏳</div>
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: 800 }}>${totalPorCobrar.toLocaleString("es-AR")}</div>
                </div>
              </section>

              <section style={{ backgroundColor: theme.card, padding: "24px", borderRadius: "20px", boxShadow: theme.shadow }}>
                <h3 style={{ marginBottom: "18px", fontWeight: 700 }}>Ingresos últimos 7 días</h3>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosGraficoVentas}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#E5E7EB"} />
                      <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fill: theme.subtext, fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.subtext, fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip cursor={{ fill: darkMode ? "#111827" : "#F3F4F6", opacity: 0.6 }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: theme.shadow }} />
                      <Bar dataKey="total" fill={theme.sidebar} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section style={{ backgroundColor: theme.card, padding: "24px", borderRadius: "20px", boxShadow: theme.shadow }}>
                <h3 style={{ marginBottom: "18px", fontWeight: 700 }}>Transacciones recientes</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: `1px solid ${darkMode ? "#334155" : "#E5E7EB"}`, color: theme.subtext }}>
                        <th style={{ padding: "10px 8px" }}>ID</th>
                        <th>Nombre</th>
                        <th>Estado</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenes.slice(0, 5).map((o) => (
                        <tr key={o.id} style={{ borderBottom: `1px solid ${darkMode ? "#1e293b" : "#F9FAFB"}` }}>
                          <td style={{ padding: "10px 8px", fontWeight: 600 }}>#{o.id.toString().slice(-3)}</td>
                          <td>{o.nombre}</td>
                          <td>
                            <span style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, backgroundColor: o.estado_orden === "Entregado" ? "#D1FAE5" : "#FEF3C7", color: o.estado_orden === "Entregado" ? "#065F46" : "#92400E" }}>
                              {o.estado_orden?.toUpperCase() || "PENDIENTE"}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>${o.presupuesto_total?.toLocaleString("es-AR") || "0"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab !== "inicio" && (
            <section style={{ backgroundColor: theme.card, borderRadius: "24px", padding: "28px", boxShadow: theme.shadow, minHeight: "70vh" }}>
              {activeTab === "servicio" && <Servicio onSave={guardarOrden} darkMode={darkMode} />}
              {activeTab === "ordenes" && <Ordenes ordenes={ordenes} setOrdenes={setOrdenes} stock={stock} setStock={setStock} darkMode={darkMode} />}
              {activeTab === "stock" && <Stock stock={stock} setStock={setStock} darkMode={darkMode} />}
              {activeTab === "ventas" && <Ventas stock={stock} setStock={setStock} ventas={ventas} setVentas={setVentas} darkMode={darkMode} />}
              {activeTab === "clientes" && <ClientesCC darkMode={darkMode} />}
              {activeTab === "presupuestos" && <Presupuestos darkMode={darkMode} />}
              {activeTab === "facturacion" && <Facturacion darkMode={darkMode} />}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default ControlCelApp;