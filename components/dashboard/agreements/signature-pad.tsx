"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Touch/mouse signature pad. Emits a trimmed-white PNG data URL (or null when
 * cleared). Handles device pixel ratio for crisp lines on phones/tablets.
 */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
  }, []);

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function down(e: React.PointerEvent) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (canvasRef.current && !empty) onChange(canvasRef.current.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <div className="border-border-strong relative rounded-xl border-2 border-dashed bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          className="h-40 w-full touch-none rounded-xl"
        />
        {empty && (
          <span className="text-subtle pointer-events-none absolute inset-0 flex items-center justify-center text-sm">
            Sign here with your finger, stylus or mouse
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        className="text-muted hover:text-foreground mt-1.5 text-xs"
      >
        Clear signature
      </button>
    </div>
  );
}
