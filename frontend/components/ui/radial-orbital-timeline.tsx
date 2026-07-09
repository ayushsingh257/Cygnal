"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/liquid-glass-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({
  timelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const [viewMode, setViewMode] = useState<"orbital">("orbital");
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);

        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }

      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;

    if (autoRotate && viewMode === "orbital") {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, viewMode]);

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 170; // Slightly smaller radius to fit within containers
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.4,
      Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-[#B0E4CC] bg-[#408A71]/10 border-[#408A71]/20";
      case "in-progress":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "pending":
        return "text-slate-400 bg-slate-800/40 border-slate-700/50";
      default:
        return "text-slate-400 bg-slate-800/40 border-slate-700/50";
    }
  };

  return (
    <div
      className="w-full h-[550px] flex flex-col items-center justify-center bg-transparent overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Glowing Center Node representing AI Engine */}
          <div className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-[#408A71] via-[#285A48] to-[#0f2422] flex items-center justify-center z-10 shadow-[0_0_20px_rgba(64,138,113,0.4)]">
            <div className="absolute w-16 h-16 rounded-full border border-[#408A71]/30 animate-ping opacity-60"></div>
            <div
              className="absolute w-20 h-20 rounded-full border border-[#408A71]/15 animate-ping opacity-40"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <div className="w-6 h-6 rounded-full bg-[#B0E4CC]/20 backdrop-blur-md border border-[#B0E4CC]/30 flex items-center justify-center">
              <Zap size={10} className="text-[#B0E4CC]" />
            </div>
          </div>

          {/* Orbital path line */}
          <div className="absolute w-[340px] h-[340px] rounded-full border border-[#408A71]/15"></div>

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => { nodeRefs.current[item.id] = el; }}
                className="absolute transition-all duration-700 cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                {/* Node Energy Glow */}
                <div
                  className={`absolute rounded-full -inset-1 ${
                    isPulsing ? "animate-pulse duration-1000" : ""
                  }`}
                  style={{
                    background: `radial-gradient(circle, rgba(64,138,113,0.15) 0%, rgba(64,138,113,0) 70%)`,
                    width: `${item.energy * 0.4 + 40}px`,
                    height: `${item.energy * 0.4 + 40}px`,
                    left: `-${(item.energy * 0.4 + 40 - 40) / 2}px`,
                    top: `-${(item.energy * 0.4 + 40 - 40) / 2}px`,
                  }}
                ></div>

                {/* Node Dot */}
                <div
                  className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${
                    isExpanded
                      ? "bg-[#408A71] text-white"
                      : isRelated
                      ? "bg-[#285A48] text-white"
                      : "bg-[#091413] text-[#B0E4CC]"
                  }
                  border
                  ${
                    isExpanded
                      ? "border-[#B0E4CC] shadow-lg shadow-[#408A71]/30"
                      : isRelated
                      ? "border-[#408A71] animate-pulse"
                      : "border-[#408A71]/20"
                  }
                  transition-all duration-300 transform
                  ${isExpanded ? "scale-125" : ""}
                `}
                >
                  <Icon size={12} />
                </div>

                {/* Node label */}
                <div
                  className={`
                  absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap
                  text-[9px] font-bold font-mono tracking-wider uppercase
                  transition-all duration-300
                  ${isExpanded ? "text-[#B0E4CC] scale-105" : "text-slate-400"}
                `}
                >
                  {item.title}
                </div>

                {/* Expanded Card Details */}
                {isExpanded && (
                  <Card className="absolute top-16 left-1/2 -translate-x-1/2 w-56 bg-[#0f2422]/95 border-[#408A71]/30 shadow-xl shadow-black/80 overflow-visible z-[300]">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-[#408A71]/40"></div>
                    <CardHeader className="pb-1.5 p-3">
                      <div className="flex justify-between items-center">
                        <Badge
                          className={`px-1.5 text-[8px] font-mono tracking-wider ${getStatusStyles(
                            item.status
                          )}`}
                        >
                          {item.status === "completed"
                            ? "COMPLETE"
                            : item.status === "in-progress"
                            ? "ACTIVE"
                            : "PENDING"}
                        </Badge>
                        <span className="text-[8px] font-mono text-slate-500">
                          {item.date}
                        </span>
                      </div>
                      <CardTitle className="text-xs mt-1.5 font-bold font-mono text-white">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-[10px] text-slate-350 p-3 pt-0">
                      <p>{item.content}</p>

                      <div className="mt-3 pt-2.5 border-t border-[#408A71]/10">
                        <div className="flex justify-between items-center text-[9px] mb-1 font-mono">
                          <span className="flex items-center text-slate-400">
                            <Zap size={8} className="mr-1 text-amber-400" />
                            Activity Rate
                          </span>
                          <span className="font-mono text-[#B0E4CC]">{item.energy}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#285A48] to-[#408A71]"
                            style={{ width: `${item.energy}%` }}
                          ></div>
                        </div>
                      </div>

                      {item.relatedIds.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#408A71]/10">
                          <div className="flex items-center mb-1.5">
                            <Link size={8} className="text-slate-400 mr-1" />
                            <h4 className="text-[8px] uppercase tracking-wider font-mono text-slate-500">
                              Connected Workflows
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find(
                                (i) => i.id === relatedId
                              );
                              return (
                                <button
                                  key={relatedId}
                                  className="flex items-center h-5 px-1.5 text-[8px] font-mono rounded border border-[#408A71]/20 bg-transparent hover:bg-[#408A71]/10 text-slate-400 hover:text-white transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(relatedId);
                                  }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight
                                    size={6}
                                    className="ml-1 text-slate-500"
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
