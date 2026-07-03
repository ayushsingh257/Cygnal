"use client";

import React, { useEffect, useRef } from "react";

interface Point3D {
  x: number;
  y: number;
  z: number;
  u: number;
  v: number;
}

interface ThreatArc {
  p1: Point3D;
  p2: Point3D;
  progress: number;
  speed: number;
  color: string;
}

export default function CyberGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = 400;
    let height = canvas.height = 400;

    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = canvas.width = rect?.width ? Math.min(rect.width, 400) : 400;
      height = canvas.height = rect?.width ? Math.min(rect.width, 400) : 400;
    };
    
    window.addEventListener("resize", handleResize);
    handleResize();

    const points: Point3D[] = [];
    const numLatitude = 16;
    const numLongitude = 22;
    const radius = 130;

    for (let i = 0; i < numLatitude; i++) {
      const lat = (i * Math.PI) / (numLatitude - 1) - Math.PI / 2;
      for (let j = 0; j < numLongitude; j++) {
        const lon = (j * 2 * Math.PI) / numLongitude;

        const x = radius * Math.cos(lat) * Math.cos(lon);
        const y = radius * Math.sin(lat);
        const z = radius * Math.cos(lat) * Math.sin(lon);

        points.push({ x, y, z, u: lat, v: lon });
      }
    }

    const threatArcs: ThreatArc[] = [];
    const maxThreatArcs = 4;

    const getRandomPoint = () => points[Math.floor(Math.random() * points.length)];

    const createThreatArc = (): ThreatArc => {
      const p1 = getRandomPoint();
      let p2 = getRandomPoint();
      while (p1 === p2) {
        p2 = getRandomPoint();
      }
      return {
        p1,
        p2,
        progress: 0,
        speed: 0.006 + Math.random() * 0.008,
        color: "rgba(6, 182, 212, 0.45)" // Subtle Cyan
      };
    };

    for (let i = 0; i < maxThreatArcs; i++) {
      threatArcs.push(createThreatArc());
    }

    let angleX = 0.001;
    let angleY = 0.003;

    const rotateX = (point: Point3D, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const y = point.y * cos - point.z * sin;
      const z = point.y * sin + point.z * cos;
      return { ...point, y, z };
    };

    const rotateY = (point: Point3D, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = point.x * cos + point.z * sin;
      const z = -point.x * sin + point.z * cos;
      return { ...point, x, z };
    };

    const project = (point: Point3D) => {
      const perspective = 350;
      const scale = perspective / (perspective + point.z);
      const x = point.x * scale + width / 2;
      const y = point.y * scale + height / 2;
      return { x, y, z: point.z, scale };
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const rotatedPoints = points.map((p) => {
        let r = rotateY(p, angleY);
        r = rotateX(r, angleX);
        return { original: p, projected: project(r) };
      });

      angleY += 0.002;
      angleX += 0.0004;

      // Draw subtle grid connections
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 0.75;
      
      for (let i = 0; i < rotatedPoints.length; i++) {
        const ptA = rotatedPoints[i];
        if (ptA.projected.z > 50) continue;

        const neighborHorizontal = rotatedPoints[(i + 1) % rotatedPoints.length];
        if (neighborHorizontal.projected.z < 50 && Math.abs(ptA.original.u - neighborHorizontal.original.u) < 0.1) {
          ctx.beginPath();
          ctx.moveTo(ptA.projected.x, ptA.projected.y);
          ctx.lineTo(neighborHorizontal.projected.x, neighborHorizontal.projected.y);
          ctx.stroke();
        }

        const indexVertical = (i + numLongitude) % rotatedPoints.length;
        const neighborVertical = rotatedPoints[indexVertical];
        if (neighborVertical.projected.z < 50) {
          ctx.beginPath();
          ctx.moveTo(ptA.projected.x, ptA.projected.y);
          ctx.lineTo(neighborVertical.projected.x, neighborVertical.projected.y);
          ctx.stroke();
        }
      }

      // Draw globe nodes
      rotatedPoints.forEach((pt) => {
        const { x, y, z, scale } = pt.projected;
        const brightness = Math.max(0, 1 - (z + radius) / (2 * radius));
        
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.12})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.2 * scale, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw threat lines
      threatArcs.forEach((arc, idx) => {
        arc.progress += arc.speed;
        
        const p1Rot = rotateX(rotateY(arc.p1, angleY), angleX);
        const p2Rot = rotateX(rotateY(arc.p2, angleY), angleX);

        const p1Proj = project(p1Rot);
        const p2Proj = project(p2Rot);

        if (p1Proj.z < 50 && p2Proj.z < 50) {
          ctx.beginPath();
          ctx.strokeStyle = arc.color;
          ctx.lineWidth = 1;

          const ctrlX = (p1Proj.x + p2Proj.x) / 2 + (p1Proj.y - p2Proj.y) * 0.2;
          const ctrlY = (p1Proj.y + p2Proj.y) / 2 + (p2Proj.x - p1Proj.x) * 0.2;

          ctx.moveTo(p1Proj.x, p1Proj.y);
          ctx.quadraticCurveTo(ctrlX, ctrlY, p2Proj.x, p2Proj.y);
          ctx.stroke();
          
          const t = arc.progress;
          const u = 1 - t;
          const px = u * u * p1Proj.x + 2 * u * t * ctrlX + t * t * p2Proj.x;
          const py = u * u * p1Proj.y + 2 * u * t * ctrlY + t * t * p2Proj.y;

          ctx.fillStyle = "rgba(6, 182, 212, 0.9)";
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, 2 * Math.PI);
          ctx.fill();
        }

        if (arc.progress >= 1) {
          threatArcs[idx] = createThreatArc();
        }
      });

      // Outer layout scope
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius + 15, 0, 2 * Math.PI);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="relative flex justify-center items-center w-full max-w-[400px] mx-auto aspect-square select-none pointer-events-none">
      <canvas ref={canvasRef} className="max-w-full max-h-full block z-10" />
      <div className="absolute inset-0 bg-radial-gradient from-zinc-500/2 to-transparent rounded-full filter blur-xl pointer-events-none" />
    </div>
  );
}
