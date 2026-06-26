import React, { useEffect, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  z: number; // depth/parallax (0.5 to 2.5)
  vx: number;
  vy: number;
  radius: number;
  color: 'blue' | 'red';
  alpha: number;
}

export const CyberSnowfall: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let nextId = 0;

    // Responsive Canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    // Initialize particles: half blue, half red
    const initParticles = () => {
      particles = [];
      const width = canvas.width;
      const height = canvas.height;
      
      // Calculate particle count based on screen size (max 2000 for performance)
      const count = Math.min(2000, Math.floor((width * height) / 1000));
      const halfCount = Math.floor(count / 2);

      // Blue particles (Top -> Down)
      for (let i = 0; i < halfCount; i++) {
        particles.push(createParticle('blue', width, height, true));
      }
      // Red particles (Bottom -> Up)
      for (let i = 0; i < halfCount; i++) {
        particles.push(createParticle('red', width, height, true));
      }
    };

    const createParticle = (
      color: 'blue' | 'red',
      width: number,
      height: number,
      randomY = false
    ): Particle => {
      const z = 0.5 + Math.random() * 2.0; // Depth factor
      const radius = (color === 'blue' ? 1.0 : 1.2) * z;
      const x = Math.random() * width;
      
      let y = 0;
      if (randomY) {
        y = Math.random() * height;
      } else {
        y = color === 'blue' ? -10 : height + 10;
      }

      // Blue falls down (+vy), Red rises up (-vy)
      const speedScale = 0.6 + Math.random() * 0.8;
      const vy = (color === 'blue' ? 1 : -1) * speedScale * (z * 0.8);
      const vx = (Math.random() - 0.5) * 0.2 * z;

      return {
        id: nextId++,
        x,
        y,
        z,
        vx,
        vy,
        radius,
        color,
        alpha: 0.3 + Math.random() * 0.6,
      };
    };

    // Listeners
    window.addEventListener('resize', resizeCanvas);
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    resizeCanvas();

    // Game loop
    const update = () => {
      const width = canvas.width;
      const height = canvas.height;
      const mouse = mouseRef.current;

      // 1. Grid Partition for Fast Collision (O(N) instead of O(N^2))
      const grid: { [key: string]: Particle[] } = {};
      const cellSize = 30; // Collision cell width/height

      // Hash blue particles into grid cells
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.color === 'blue') {
          const cx = Math.floor(p.x / cellSize);
          const cy = Math.floor(p.y / cellSize);
          const key = `${cx},${cy}`;
          if (!grid[key]) grid[key] = [];
          grid[key].push(p);
        }
      }

      const collidedIds = new Set<number>();

      // Check red particles against the grid
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.color === 'red') {
          const cx = Math.floor(p.x / cellSize);
          const cy = Math.floor(p.y / cellSize);

          // Check cell and 8 neighbors
          neighborCheckLoop:
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const neighborKey = `${cx + dx},${cy + dy}`;
              const blueParticles = grid[neighborKey];
              if (blueParticles) {
                for (let j = 0; j < blueParticles.length; j++) {
                  const bp = blueParticles[j];
                  if (collidedIds.has(bp.id)) continue;

                  const distSq = (p.x - bp.x) ** 2 + (p.y - bp.y) ** 2;
                  const collisionDist = p.radius + bp.radius + 3; // buffer radius
                  if (distSq < collisionDist ** 2) {
                    // Collision! Mark both for removal
                    collidedIds.add(p.id);
                    collidedIds.add(bp.id);
                    break neighborCheckLoop; // red particle is dead, check next red
                  }
                }
              }
            }
          }
        }
      }

      // Update and filter particles
      const nextParticles: Particle[] = [];
      let blueDead = 0;
      let redDead = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (collidedIds.has(p.id)) {
          if (p.color === 'blue') blueDead++;
          else redDead++;
          continue;
        }

        // Apply mouse disturbance
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          const forceRadius = 100;
          if (distSq < forceRadius * forceRadius) {
            const dist = Math.sqrt(distSq) || 1;
            const force = (forceRadius - dist) / forceRadius;
            // Push particles slightly away from mouse
            p.x += (dx / dist) * force * 2.0 * p.z;
            p.y += (dy / dist) * force * 1.0 * p.z;
          }
        }

        // Move particle
        p.x += p.vx;
        p.y += p.vy;

        // Reset if offscreen
        if (p.color === 'blue' && p.y > height + 10) {
          blueDead++;
          continue;
        }
        if (p.color === 'red' && p.y < -10) {
          redDead++;
          continue;
        }
        if (p.x < -10 || p.x > width + 10) {
          if (p.color === 'blue') blueDead++;
          else redDead++;
          continue;
        }

        nextParticles.push(p);
      }

      // Respawn dead particles
      for (let i = 0; i < blueDead; i++) {
        nextParticles.push(createParticle('blue', width, height, false));
      }
      for (let i = 0; i < redDead; i++) {
        nextParticles.push(createParticle('red', width, height, false));
      }

      particles = nextParticles;

      // Draw
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        
        if (p.color === 'blue') {
          // #00D4FF + glow
          ctx.fillStyle = `rgba(0, 212, 255, ${p.alpha})`;
          ctx.shadowColor = '#00D4FF';
        } else {
          // #FF4040 + glow
          ctx.fillStyle = `rgba(255, 64, 64, ${p.alpha})`;
          ctx.shadowColor = '#FF4040';
        }
        
        // Depth-based blur or shadow
        if (p.z > 1.8) {
          ctx.shadowBlur = 4 * p.z;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fill();
      }

      // Reset shadow for next frame drawing
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};
