import React from "react";
import { Target, Waves, Crosshair, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThreeDotsLoader } from "./ThreeDotsLoader";
import { SummaryStats } from "../types";

interface MetricCardsProps {
  stats: SummaryStats;
  isLoading?: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ stats, isLoading = false }) => {
  const cards = [
    {
      id: "corals",
      title: "Corals Detected",
      val: stats.total_corals_detected,
      icon: Target,
      strip: "bg-gradient-to-r from-[#0f1e4a] to-[#0d7c85]",
      bg: "bg-teal-50 text-[#0d7c85]",
      sub: isLoading ? "Analyzing..." : stats.total_corals_detected > 0 ? "Instances Identified" : "No Corals",
      badge: "coral" as const,
    },
    {
      id: "coverage",
      title: "Reef Coverage",
      val: `${stats.coral_coverage_pct}%`,
      icon: Waves,
      strip: "bg-gradient-to-r from-emerald-600 to-teal-400",
      bg: "bg-emerald-50 text-emerald-600",
      sub: isLoading ? "Calculating..." : `${stats.coral_covered_pixels.toLocaleString("en-US")} px total`,
      badge: "success" as const,
    },
    {
      id: "iou",
      title: "Avg IoU Confidence",
      val: stats.mean_iou_confidence.toFixed(3),
      icon: Crosshair,
      strip: "bg-gradient-to-r from-sky-600 to-cyan-400",
      bg: "bg-sky-50 text-sky-600",
      sub: isLoading ? "Evaluating..." : stats.mean_iou_confidence >= 0.7 ? "High Fidelity" : "Standard Precision",
      badge: "info" as const,
    },
    {
      id: "stability",
      title: "Avg Stability Score",
      val: stats.mean_stability_score.toFixed(3),
      icon: ShieldCheck,
      strip: "bg-gradient-to-r from-indigo-600 to-purple-400",
      bg: "bg-indigo-50 text-indigo-600",
      sub: isLoading ? "Validating..." : stats.mean_stability_score >= 0.8 ? "Reliable Bounds" : "Evaluated",
      badge: "secondary" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.id}
            className="relative overflow-hidden border-slate-200/80 bg-white shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
          >
            {/* Rich Top Accent Strip */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${c.strip}`} />

            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {c.title}
              </CardTitle>
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${c.bg}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-extrabold font-mono tracking-tight text-[#0f1e4a]">
                {isLoading ? <ThreeDotsLoader size="sm" color="#0d7c85" /> : c.val}
              </div>
              <div className="mt-2.5 flex items-center">
                <Badge variant={c.badge} className="text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {c.sub}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
