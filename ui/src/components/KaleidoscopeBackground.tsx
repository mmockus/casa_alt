import React, { useEffect, useRef } from 'react';

export const KaleidoscopeBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let cx = w / 2;
    let cy = h / 2;
    const slices = 32;
    const start = performance.now();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      cx = w / 2;
      cy = h / 2;
    };
    window.addEventListener('resize', handleResize);

    function draw(t: number) {
      const elapsed = (t - start) / 1000;
      const effectiveBpm = 120;
      const speed = 0.4 * (effectiveBpm / 120);
      const rotation = elapsed * speed;
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalCompositeOperation = 'lighter';

      const baseRadius = Math.min(cx, cy) * 1.55;
      const pulse = 0.25 + 0.15 * Math.sin(elapsed * (effectiveBpm / 60) * Math.PI * 2);
      const layerCount = 4;

      for (let layer = 0; layer < layerCount; layer++) {
        const layerRatio = (layer + 1) / layerCount;
        const layerRot = rotation * (1 + layer * 0.2) + (layer * Math.PI) / 8;
        const layerRadius = baseRadius * (0.3 + layerRatio * (0.5 + pulse));
        for (let i = 0; i < slices; i++) {
          ctx.save();
          const angle = ((Math.PI * 2) / slices) * i;
          ctx.rotate(angle + layerRot);
          if (i % 2 === 0) ctx.scale(1, -1);
          const hueBase = (elapsed * 50 + (i * 360) / slices + layer * 40) % 360;
          const hue2 = (hueBase + 90 + 40 * Math.sin(elapsed * 0.7 + layer)) % 360;
          const hue3 = (hueBase + 180 + 80 * Math.cos(elapsed * 0.5 + i)) % 360;
          const grd = ctx.createLinearGradient(0, 0, layerRadius, layerRadius);
          grd.addColorStop(0, `hsla(${hueBase},95%,65%,0.9)`);
          grd.addColorStop(0.4, `hsla(${hue2},85%,55%,0.7)`);
          grd.addColorStop(0.75, `hsla(${hue3},75%,45%,0.55)`);
          grd.addColorStop(1, 'rgba(0,0,0,0.05)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          const shardDepth = layerRadius * (0.55 + 0.25 * Math.sin(elapsed * 1.3 + layer + i));
          ctx.moveTo(0, 0);
          ctx.lineTo(layerRadius, layerRadius * 0.08);
          ctx.quadraticCurveTo(shardDepth * 0.6, shardDepth * 0.6, layerRadius * 0.18, shardDepth);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      const sparkleCount = 80;
      for (let s = 0; s < sparkleCount; s++) {
        const a = (s / sparkleCount) * Math.PI * 2 + rotation * 0.5 + Math.sin(elapsed + s) * 0.3;
        const r = baseRadius * 0.1 + baseRadius * 0.9 * (((s * 997) % 100) / 100);
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        const sparkleHue = (elapsed * 120 + s * 11) % 360;
        const size = 2 + 2 * Math.sin(elapsed * 5 + s);
        ctx.fillStyle = `hsla(${sparkleHue},100%,70%,0.35)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      animationRef.current = requestAnimationFrame(draw);
    }
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
};

export default KaleidoscopeBackground;
