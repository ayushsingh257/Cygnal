"use client";

import React from "react";
import { Shield, FileCode, Search, User } from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  type: "case" | "evidence" | "scan" | "analyst";
  x: number;
  y: number;
  metadata?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
}

interface IocGraphProps {
  caseTitle: string;
  evidenceList: { filename: string; file_hash: string }[];
  timeline: { event_type: string; description: string; user: string }[];
}

export default function IocGraph({ caseTitle, evidenceList, timeline }: IocGraphProps) {
  // Center is Case node
  const nodes: GraphNode[] = [
    { id: "case_root", label: caseTitle.slice(0, 16) + "...", type: "case", x: 220, y: 150 }
  ];
  const edges: GraphEdge[] = [];

  // 1. Gather analysts
  const analysts = Array.from(new Set(timeline.map(t => t.user))).slice(0, 2);
  analysts.forEach((analyst, idx) => {
    const id = `analyst_${idx}`;
    nodes.push({
      id,
      label: analyst,
      type: "analyst",
      x: 220 + (idx === 0 ? -120 : 120),
      y: 40,
      metadata: `SOC Analyst`
    });
    edges.push({ from: id, to: "case_root", type: "assigned_to" });
  });

  // 2. Gather evidence files
  evidenceList.slice(0, 3).forEach((ev, idx) => {
    const id = `evidence_${idx}`;
    const yCoord = 70 + idx * 75;
    nodes.push({
      id,
      label: ev.filename,
      type: "evidence",
      x: 50,
      y: yCoord,
      metadata: `SHA-256: ${ev.file_hash.slice(0, 12)}...`
    });
    edges.push({ from: "case_root", to: id, type: "includes" });
  });

  // 3. Gather associated scans
  const associatedScans = timeline.filter(t => t.event_type === "scan_associated").slice(0, 3);
  associatedScans.forEach((scan, idx) => {
    const id = `scan_${idx}`;
    const yCoord = 70 + idx * 75;
    nodes.push({
      id,
      label: scan.description.replace("Associated scan from ", "").split(" (")[0],
      type: "scan",
      x: 390,
      y: yCoord,
      metadata: scan.description
    });
    edges.push({ from: "case_root", to: id, type: "correlated_scan" });
  });

  const nodeColorClasses: Record<string, { fill: string; stroke: string; text: string }> = {
    case: { fill: "fill-zinc-950", stroke: "stroke-cyan-500", text: "text-cyan-400 font-bold" },
    evidence: { fill: "fill-zinc-950", stroke: "stroke-zinc-700", text: "text-zinc-400" },
    scan: { fill: "fill-zinc-950", stroke: "stroke-zinc-700", text: "text-zinc-400" },
    analyst: { fill: "fill-zinc-950", stroke: "stroke-zinc-800", text: "text-zinc-500" }
  };

  return (
    <div className="space-y-4 font-mono select-none">
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <Activity size={14} className="text-cyan-500" />
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
          IOC Correlation Graph
        </h4>
      </div>

      <div className="w-full bg-[#09090b]/40 border border-white/5 rounded-md p-2 flex justify-center items-center overflow-x-auto">
        <svg 
          viewBox="0 0 440 300" 
          className="w-full max-w-[440px] aspect-[44/30] font-mono select-none"
        >
          {/* Defs for subtle shadows */}
          <defs>
            <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Draw Connection Edges */}
          {edges.map((edge, idx) => {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const isGlow = fromNode.type === "case" || toNode.type === "case";
            return (
              <g key={idx}>
                {/* Edge line */}
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  className={`stroke-[1] ${
                    isGlow ? "stroke-cyan-500/20" : "stroke-white/5"
                  }`}
                />
                
                {/* Minimal animated trace particles */}
                <circle r="1.5" className="fill-cyan-500/60">
                  <animateMotion
                    dur="5s"
                    repeatCount="indefinite"
                    path={`M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`}
                  />
                </circle>
              </g>
            );
          })}

          {/* Draw Nodes */}
          {nodes.map((node) => {
            const colors = nodeColorClasses[node.type];
            return (
              <g key={node.id} className="cursor-help" title={node.metadata}>
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.type === "case" ? 18 : 12}
                  className={`${colors.fill} ${colors.stroke} stroke-[1]`}
                  filter="url(#soft-shadow)"
                />
                
                {/* Node Icons */}
                <g transform={`translate(${node.x - 6}, ${node.y - 6})`}>
                  {node.type === "case" && <Shield className="w-3 h-3 text-cyan-400" />}
                  {node.type === "evidence" && <FileCode className="w-3 h-3 text-zinc-400" />}
                  {node.type === "scan" && <Search className="w-3 h-3 text-zinc-400" />}
                  {node.type === "analyst" && <User className="w-3 h-3 text-zinc-550" />}
                </g>

                {/* Node Label */}
                <text
                  x={node.x}
                  y={node.y + (node.type === "case" ? 28 : 22)}
                  textAnchor="middle"
                  className="fill-zinc-400 text-[8px] font-sans font-medium"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Visual Guide Legend */}
      <div className="flex justify-center gap-4 text-[9px] text-zinc-500 border-t border-white/5 pt-2 select-none">
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Case Hub</div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-650" /> Evidence</div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-650" /> Scans</div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-800" /> Analyst</div>
      </div>
    </div>
  );
}
