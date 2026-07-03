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
    // Position evidence on the left side
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
    // Position scans on the right side
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

  const nodeColorClasses: Record<string, { fill: string; stroke: string; glow: string; text: string }> = {
    case: { fill: "fill-purple-950/70", stroke: "stroke-purple-500", glow: "shadow-purple-500/50", text: "text-purple-400 font-bold" },
    evidence: { fill: "fill-cyan-950/70", stroke: "stroke-cyan-400", glow: "shadow-cyan-400/50", text: "text-cyan-400" },
    scan: { fill: "fill-blue-950/70", stroke: "stroke-blue-500", glow: "shadow-blue-500/50", text: "text-blue-400" },
    analyst: { fill: "fill-zinc-950/70", stroke: "stroke-zinc-500", glow: "shadow-zinc-500/50", text: "text-gray-400" }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <Activity size={14} className="text-cyan-400 glow-cyan animate-pulse" />
        <h4 className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
          IOC Correlation Graph
        </h4>
      </div>

      <div className="w-full bg-black/45 border border-white/5 rounded-lg p-2 flex justify-center items-center overflow-x-auto">
        <svg 
          viewBox="0 0 440 300" 
          className="w-full max-w-[440px] aspect-[44/30] font-mono select-none"
        >
          {/* Defs for gradients/glowing filters */}
          <defs>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
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
                  className={`stroke-[1.5] ${
                    isGlow ? "stroke-cyan-500/30" : "stroke-white/5"
                  }`}
                />
                
                {/* Animated trace particle floating along the lines */}
                <circle r="2.5" className="fill-cyan-400">
                  <animateMotion
                    dur="4s"
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
                {/* Node outer glow ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.type === "case" ? 22 : 14}
                  className={`${colors.fill} ${colors.stroke} stroke-[1.5]`}
                  filter={node.type === "case" ? "url(#glow-purple)" : node.type === "evidence" ? "url(#glow-cyan)" : undefined}
                />
                
                {/* Node Icons */}
                <g transform={`translate(${node.x - 7}, ${node.y - 7})`}>
                  {node.type === "case" && <Shield className="w-3.5 h-3.5 text-purple-400" />}
                  {node.type === "evidence" && <FileCode className="w-3.5 h-3.5 text-cyan-400" />}
                  {node.type === "scan" && <Search className="w-3.5 h-3.5 text-blue-400" />}
                  {node.type === "analyst" && <User className="w-3.5 h-3.5 text-gray-500" />}
                </g>

                {/* Node Label */}
                <text
                  x={node.x}
                  y={node.y + (node.type === "case" ? 34 : 24)}
                  textAnchor="middle"
                  className="fill-gray-300 text-[8px] tracking-wide"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Visual Guide Legend */}
      <div className="flex justify-center gap-4 text-[9px] font-mono text-gray-500 border-t border-white/5 pt-2">
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Case Center</div>
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Evidence</div>
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Scans</div>
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> Analyst</div>
      </div>
    </div>
  );
}
