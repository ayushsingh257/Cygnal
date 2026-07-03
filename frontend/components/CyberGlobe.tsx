"use client";

import React, { useEffect, useRef } from "react";

interface Point3D {
  x: number;
  y: number;
  z: number;
  u: number; // latitude coordinate mapping
  v: number; // longitude coordinate mapping
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
    let width = canvas.width = 500;
    let height = canvas.height = 500;

    // Responsive canvas resizing
    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = canvas.width = rect?.width ? Math.min(rect.width, 500) : 500;
      height = canvas.height = rect?.width ? Math.min(rect.width, 500) : 500;
    };
    
    window.addEventListener("resize", handleResize);
    handleResize();

    // Generate Points on a Sphere
    const points: Point3D[] = [];
    const numLatitude = 18;
    const numLongitude = 26;
    const radius = 160;

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

    // Active Threat Arcs connecting points on the globe
    const threatArcs: ThreatArc[] = [];
    const maxThreatArcs = 5;

    const getRandomPoint = () => points[Math.floor(Math.random() * points.length)];

    const createThreatArc = (): ThreatArc => {
      const p1 = getRandomPoint();
      let p2 = getRandomPoint();
      while (p1 === p2) {
        p2 = getRandomPoint();
      }

      const colors = ["#00f2fe", "#f72585", "#7209b7", "#1e90ff"];
      return {
        p1,
        p2,
        progress: 0,
        speed: 0.008 + Math.random() * 0.012,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    };

    // Initialize threat arcs
    for (let i = 0; i < maxThreatArcs; i++) {
      threatArcs.push(createThreatArc());
    }

    let angleX = 0.002;
    let angleY = 0.005;

    // Helper functions for 3D rotation
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
      const perspective = 400;
      const scale = perspective / (perspective + point.z);
      const x = point.x * scale + width / 2;
      const y = point.y * scale + height / 2;
      return { x, y, z: point.z, scale };
    };

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Rotate and Project all points
      const rotatedPoints = points.map((p) => {
        let r = rotateY(p, angleY);
        r = rotateX(r, angleX);
        return { original: p, projected: project(r) };
      });

      // Update rotation angles
      angleY += 0.003;
      angleX += 0.0006;

      // Draw Grid / Connections between nearby coordinates
      ctx.strokeStyle = "rgba(0, 242, 254, 0.05)";
      ctx.lineWidth = 1;
      
      for (let i = 0; i < rotatedPoints.length; i++) {
        const ptA = rotatedPoints[i];
        if (ptA.projected.z > 80) continue; // Skip rendering back face connections for clarity

        // Connect with horizontal grid neighbors
        const neighborHorizontal = rotatedPoints[(i + 1) % rotatedPoints.length];
        if (neighborHorizontal.projected.z < 80 && Math.abs(ptA.original.u - neighborHorizontal.original.u) < 0.1) {
          ctx.beginPath();
          ctx.moveTo(ptA.projected.x, ptA.projected.y);
          ctx.lineTo(neighborHorizontal.projected.x, neighborHorizontal.projected.y);
          ctx.stroke();
        }

        // Connect with vertical grid neighbors
        const indexVertical = (i + numLongitude) % rotatedPoints.length;
        const neighborVertical = rotatedPoints[indexVertical];
        if (neighborVertical.projected.z < 80) {
          ctx.beginPath();
          ctx.moveTo(ptA.projected.x, ptA.projected.y);
          ctx.lineTo(neighborVertical.projected.x, neighborVertical.projected.y);
          ctx.stroke();
        }
      }

      // Draw Globe Surface Points
      rotatedPoints.forEach((pt) => {
        const { x, y, z, scale } = pt.projected;
        
        // Z-buffering shading: darker points in back
        const brightness = Math.max(0, 1 - (z + radius) / (2 * radius));
        ctx.fillStyle = `rgba(0, 242, 254, ${brightness * 0.45})`;

        ctx.beginPath();
        // Dot sizes depending on perspective scale
        ctx.arc(x, y, 1.5 * scale, 0, 2 * Math.PI);
        ctx.fill();
        
        // Dynamic coordinates indicator effect
        if (Math.random() < 0.0001 && z < 0) {
          ctx.font = "8px monospace";
          ctx.fillStyle = "rgba(0, 242, 254, 0.8)";
          ctx.fillText(`GEO [${pt.original.u.toFixed(2)}, ${pt.original.v.toFixed(2)}]`, x + 6, y + 2);
          ctx.beginPath();
          ctx.strokeStyle = "rgba(0, 242, 254, 0.4)";
          ctx.moveTo(x, y);
          ctx.lineTo(x + 5, y);
          ctx.stroke();
        }
      });

      // Update and Draw Threat Arcs
      threatArcs.forEach((arc, idx) => {
        arc.progress += arc.speed;
        
        // Rotate start and endpoints
        const p1Rot = rotateX(rotateY(arc.p1, angleY), angleX);
        const p2Rot = rotateX(rotateY(arc.p2, angleY), angleX);

        const p1Proj = project(p1Rot);
        const p2Proj = project(p2Rot);

        // Render curve only if it's on front hemisphere
        if (p1Proj.z < 60 && p2Proj.z < 60) {
          ctx.beginPath();
          ctx.strokeStyle = arc.color;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 8;
          ctx.shadowColor = arc.color;

          // Draw bezier curve for 3D arcs
          const ctrlX = (p1Proj.x + p2Proj.x) / 2 + (p1Proj.y - p2Proj.y) * 0.25;
          const ctrlY = (p1Proj.y + p2Proj.y) / 2 + (p2Proj.x - p1Proj.x) * 0.25;

          ctx.moveTo(p1Proj.x, p1Proj.y);
          ctx.quadraticCurveTo(ctrlX, ctrlY, p2Proj.x, p2Proj.y);
          ctx.stroke();
          
          // Clear shadow effects to prevent affecting other lines
          ctx.shadowBlur = 0;

          // Animate particle travelling along the threat arc
          const t = arc.progress;
          const u = 1 - t;
          const px = u * u * p1Proj.x + 2 * u * t * ctrlX + t * t * p2Proj.x;
          const py = u * u * p1Proj.y + 2 * u * t * ctrlY + t * t * p2Proj.y;

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Recycle finished arcs
        if (arc.progress >= 1) {
          threatArcs[idx] = createThreatArc();
        }
      });

      // Overlay target scope overlay lines for cybersecurity feeling
      ctx.strokeStyle = "rgba(0, 242, 254, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Center circle
      ctx.arc(width / 2, height / 2, radius + 20, 0, 2 * Math.PI);
      ctx.stroke();

      // Top-Left and Bottom-Right crosshair ticks
      ctx.beginPath();
      ctx.moveTo(width / 2 - 20, height / 2);
      ctx.lineTo(width / 2 + 20, height / 2);
      ctx.moveTo(width / 2, height / 2 - 20);
      ctx.lineTo(width / 2, height / 2 + 20);
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
    <div className="relative flex justify-center items-center w-full max-w-[500px] mx-auto aspect-square select-none">
      <canvas ref={canvasRef} className="max-w-full max-h-full block z-10" />
      <div className="absolute inset-0 bg-radial-gradient from-cyan-500/5 to-transparent rounded-full filter blur-xl pointer-events-none" />
    </div>
  );
}
