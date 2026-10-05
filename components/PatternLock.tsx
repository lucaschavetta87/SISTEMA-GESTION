"use client";
import React, { useRef, useEffect, useState } from 'react';

interface PatternLockProps {
  onPatternChange: (patternSequence: string) => void;
  size?: number; // Tamaño del canvas (cuadrado)
}

// Mapa de puntos para la secuencia numérica (del 1 al 9, estilo teléfono)
const pointsMap = [
  { x: 1, y: 1, id: 1 }, { x: 2, y: 1, id: 2 }, { x: 3, y: 1, id: 3 },
  { x: 1, y: 2, id: 4 }, { x: 2, y: 2, id: 5 }, { x: 3, y: 2, id: 6 },
  { x: 1, y: 3, id: 7 }, { x: 2, y: 3, id: 8 }, { x: 3, y: 3, id: 9 }
];

const azulMendoza = '#3b82f6';
const amarilloSeguridad = '#fbbf24';

export default function PatternLock({ onPatternChange, size = 180 }: PatternLockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState<number[]>([]);
  const [currentMousePos, setCurrentMousePos] = useState({ x: 0, y: 0 });

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const drawCanvas = (ctx: CanvasRenderingContext2D) => {
    // Fondo transparente para que use el del panel de ControlCel
    ctx.clearRect(0, 0, size, size);

    const pointRadius = size * 0.08;
    const spacing = size / 4; // Espaciado entre centros

    // Dibujar la grilla de 9 puntos base (en gris oscuro para el modo oscuro)
    pointsMap.forEach(point => {
      ctx.beginPath();
      const px = point.x * spacing;
      const py = point.y * spacing;
      ctx.arc(px, py, pointRadius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#334155'; // Color de los puntos base
      ctx.fill();
    });

    // Dibujar la línea de conexión (amarillo seguridad para resaltar)
    if (selectedPoints.length > 1) {
      ctx.beginPath();
      ctx.lineWidth = size * 0.03;
      ctx.strokeStyle = amarilloSeguridad;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const firstPoint = pointsMap.find(p => p.id === selectedPoints[0]);
      if (firstPoint) ctx.moveTo(firstPoint.x * spacing, firstPoint.y * spacing);

      for (let i = 1; i < selectedPoints.length; i++) {
        const point = pointsMap.find(p => p.id === selectedPoints[i]);
        if (point) ctx.lineTo(point.x * spacing, point.y * spacing);
      }
      
      // Dibujar la línea desde el último punto hasta el mouse (mientras arrastra)
      if (isDrawing) {
        ctx.lineTo(currentMousePos.x, currentMousePos.y);
      }
      
      ctx.stroke();
    } else if (isDrawing && selectedPoints.length === 1) {
      // Línea desde el primer punto hasta el mouse
      ctx.beginPath();
      ctx.lineWidth = size * 0.03;
      ctx.strokeStyle = amarilloSeguridad;
      ctx.lineCap = 'round';
      const firstPoint = pointsMap.find(p => p.id === selectedPoints[0]);
      if (firstPoint) {
        ctx.moveTo(firstPoint.x * spacing, firstPoint.y * spacing);
        ctx.lineTo(currentMousePos.x, currentMousePos.y);
        ctx.stroke();
      }
    }

    // Dibujar los puntos seleccionados resaltados
    selectedPoints.forEach(pointId => {
      const point = pointsMap.find(p => p.id === pointId);
      if (point) {
        ctx.beginPath();
        const px = point.x * spacing;
        const py = point.y * spacing;
        ctx.arc(px, py, pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${amarilloSeguridad}44`; // Relleno amarillo semi-transparente
        ctx.fill();
        ctx.lineWidth = size * 0.015;
        ctx.strokeStyle = amarilloSeguridad; // Borde amarillo
        ctx.stroke();
      }
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) drawCanvas(ctx);
  }, [selectedPoints, currentMousePos, isDrawing]);

  // Manejo de eventos de mouse y touch
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setSelectedPoints([]); // Resetear al empezar nuevo dibujo
    handleMove(e); // Activar el primer punto inmediatamente
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getCanvasCoords(e);
    setCurrentMousePos(pos);
    
    const spacing = size / 4;
    const hitTolerance = size * 0.12; // Radio de captura de los puntos

    pointsMap.forEach(point => {
      const dx = pos.x - (point.x * spacing);
      const dy = pos.y - (point.y * spacing);
      // Si el mouse está cerca del punto y no ha sido seleccionado
      if (Math.sqrt(dx * dx + dy * dy) < hitTolerance) {
        if (!selectedPoints.includes(point.id)) {
          setSelectedPoints(prev => [...prev, point.id]);
        }
      }
    });
  };

  const handleEnd = () => {
    setIsDrawing(false);
    // Solo notificar si se seleccionaron más de 1 punto (para evitar toques accidentales)
    if (selectedPoints.length > 1) {
      onPatternChange(selectedPoints.join(''));
    } else {
      setSelectedPoints([]); // Resetear si el dibujo es inválido
      onPatternChange('');
    }
  };

  return (
    <div style={{ display: 'inline-block', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ cursor: isDrawing ? 'grabbing' : 'pointer', border: '1px solid #334155', borderRadius: '15px' }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd} // Cancelar si sale del canvas
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      {selectedPoints.length > 1 && !isDrawing && (
          <button 
            onClick={() => { setSelectedPoints([]); onPatternChange(''); }}
            style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(239, 68, 68, 0.8)', color: 'white', border: 'none', borderRadius: '5px', padding: '3px 6px', fontSize: '0.65rem', cursor: 'pointer', outline: 'none' }}
          >
              Limpiar
          </button>
      )}
    </div>
  );
}