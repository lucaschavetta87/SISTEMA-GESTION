"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import logoControlCel from '../assets/logo.png';
import { tieneModulo, type Sesion } from '../app/lib/auth';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void; // Cambiado de string a any para aceptar el Dispatch de useState
  darkMode: boolean;
  setDarkMode: (val: any) => void;   // Cambiado de boolean a any para evitar conflictos de tipado
  sesion: Sesion | null;
  onSalir: () => void;
  sucursales?: { id: number; nombre: string; direccion?: string }[];
  sucursalActivaId?: number;
  onCambiarSucursal?: (id: number) => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  sesion,
  onSalir,
  sucursales = [],
  sucursalActivaId,
  onCambiarSucursal,
}: NavbarProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const ve = (modulo: string) => tieneModulo(sesion, modulo);

  const navButtonStyle = (tabName: string): React.CSSProperties => {
    const isActive = activeTab === tabName;
    const isHovered = hoveredTab === tabName;

    return {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '10px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: isActive ? '700' : '500',
      fontSize: '0.875rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: '12px',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
      backgroundColor: isActive 
        ? '#ffffff' 
        : (isHovered ? 'rgba(255, 255, 255, 0.12)' : 'transparent'),
      color: isActive ? '#4f46e5' : '#e0e7ff', 
      marginBottom: '4px',
      boxShadow: isActive ? '0 4px 15px rgba(0,0,0,0.2)' : 'none',
      transform: isHovered && !isActive ? 'translateX(6px)' : 'none',
    };
  };

  const dynamicSidebarStyle: React.CSSProperties = {
    ...sidebarStyle,
    background: darkMode 
      ? 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)' 
      : 'linear-gradient(180deg, #4f46e5 0%, #6366f1 100%)',
    borderRight: `none`,
  };

  return (
    <nav style={dynamicSidebarStyle}>
      {/* HEADER */}
      <div 
        onClick={() => setActiveTab('inicio')}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          cursor: 'pointer',
          padding: '24px 10px',
          marginBottom: '10px',
        }}
      >
        <div style={{ 
          backgroundColor: '#ffffff', 
          padding: '6px', 
          borderRadius: '8px', 
          display: 'flex',
          boxShadow: '0 4px 10px rgba(0,0,0,0.15)' 
        }}>
          <Image src={logoControlCel} alt="Logo" width={28} height={28} style={{ objectFit: 'contain' }} />
        </div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: '#ffffff', letterSpacing: '-0.5px' }}>
          CON<span style={{ color: '#a5b4fc' }}>FIX</span>
        </h1>
      </div>

      {/* CONTENEDOR DE SCROLL */}
      <div style={scrollContainerStyle}>
        <p style={sectionTitleStyle}>Gestión</p>
        {ve('inicio') && (
          <button onMouseEnter={() => setHoveredTab('inicio')} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab('inicio')} style={navButtonStyle('inicio')}>
            <span style={{ width: '20px' }}>🏠</span> Inicio
          </button>
        )}
        {ve('servicio') && (
          <button onMouseEnter={() => setHoveredTab('servicio')} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab('servicio')} style={navButtonStyle('servicio')}>
            <span style={{ width: '20px' }}>🛠️</span> Ingreso Equipo
          </button>
        )}
        {ve('ordenes') && (
          <button onMouseEnter={() => setHoveredTab('ordenes')} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab('ordenes')} style={navButtonStyle('ordenes')}>
            <span style={{ width: '20px' }}>📋</span> Ordenes Taller
          </button>
        )}

        <p style={{...sectionTitleStyle, marginTop: '24px'}}>Comercial</p>
        {ve('ventas') && (
          <button onMouseEnter={() => setHoveredTab('ventas')} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab('ventas')} style={navButtonStyle('ventas')}>
            <span style={{ width: '20px' }}>💰</span> Punto de Venta
          </button>
        )}
        {ve('caja') && (
          <button onMouseEnter={() => setHoveredTab('caja')} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab('caja')} style={navButtonStyle('caja')}>
            <span style={{ width: '20px' }}>💵</span> Caja y Cierres
          </button>
        )}
        {ve('stock') && (
          <button onMouseEnter={() => setHoveredTab('stock')} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab('stock')} style={navButtonStyle('stock')}>
            <span style={{ width: '20px' }}>📦</span> Inventario
          </button>
        )}
        {ve('presupuestos') && (
          <button onMouseEnter={() => setHoveredTab('presupuestos')} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab('presupuestos')} style={navButtonStyle('presupuestos')}>
            <span style={{ width: '20px' }}>📄</span> Presupuestos
          </button>
        )}
        {ve('clientes') && (
          <button onMouseEnter={() => setHoveredTab('clientes')} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab('clientes')} style={navButtonStyle('clientes')}>
            <span style={{ width: '20px' }}>💳</span> Cuenta Corriente
          </button>
        )}

        <p style={{...sectionTitleStyle, marginTop: '24px'}}>Configuración</p>
        {ve('facturacion') && (
          <button onMouseEnter={() => setHoveredTab('facturacion')} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab('facturacion')} style={navButtonStyle('facturacion')}>
            <span style={{ width: '20px' }}>🚀</span> Facturación ARCA
          </button>
        )}
        {ve('usuarios') && (
          <button onMouseEnter={() => setHoveredTab('usuarios')} onMouseLeave={() => setHoveredTab(null)} onClick={() => setActiveTab('usuarios')} style={navButtonStyle('usuarios')}>
            <span style={{ width: '20px' }}>👥</span> Gestión de Usuarios
          </button>
        )}
      </div>

      {/* FOOTER ACCIONES */}
      <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {sesion?.rol === 'admin' && sucursales.length > 1 && (
          <div>
            <div style={{ fontSize: '0.6rem', color: '#c7d2fe', fontWeight: 700, textTransform: 'uppercase', marginBottom: '5px' }}>
              Sucursal activa
            </div>
            <select
              value={sucursalActivaId ?? sesion.sucursal.id}
              onChange={(e) => onCambiarSucursal?.(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.25)',
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id} style={{ color: '#111827' }}>{s.nombre}</option>
              ))}
            </select>
          </div>
        )}

        <div
          onClick={() => setActiveTab('inicio')}
          style={{
            fontSize: '0.75rem',
            color: '#ffffff',
            textAlign: 'center',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '10px',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div style={{ fontWeight: 800 }}>{sesion?.nombre || '—'}</div>
          <div style={{ fontSize: '0.65rem', color: '#c7d2fe', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
            {sesion?.rol === 'admin' ? 'Administrador · ' : ''}
            {(sucursales.find((s) => s.id === (sucursalActivaId ?? sesion?.sucursal.id))?.nombre) || sesion?.sucursal.nombre}
          </div>
        </div>

        <button 
          onClick={onSalir}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#fecaca',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontWeight: '600',
            fontSize: '0.8rem',
            transition: '0.3s'
          }}
        >
          ⏻ CERRAR SESIÓN
        </button>

        <button 
          onClick={() => setDarkMode(!darkMode)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontWeight: '600',
            fontSize: '0.8rem',
            backdropFilter: 'blur(8px)',
            transition: '0.3s'
          }}
        >
          {darkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
        </button>

        <div style={{ paddingTop: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: '#c7d2fe', fontWeight: '700', textTransform: 'uppercase' }}>Mendoza, Argentina</div>
          <div style={{ fontSize: '0.75rem', color: '#ffffff', fontWeight: '700', marginTop: '2px' }}>
            {(sucursales.find((s) => s.id === (sucursalActivaId ?? sesion?.sucursal.id))?.direccion) || 'CATAMARCA 42'}
          </div>
        </div>
      </div>
    </nav>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: '800',
  letterSpacing: '1px',
  margin: '0 0 10px 12px',
  textTransform: 'uppercase',
  color: '#c7d2fe',
  opacity: 0.8
};

const sidebarStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '260px',
  height: '100vh',
  padding: '0 16px 16px 16px',
  position: 'fixed',
  left: 0,
  top: 0,
  zIndex: 1000,
  transition: 'all 0.3s ease',
  overflowX: 'hidden'
};

const scrollContainerStyle: React.CSSProperties = {
  flexGrow: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingRight: '4px',
  display: 'flex',
  flexDirection: 'column'
};