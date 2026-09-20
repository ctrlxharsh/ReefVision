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

export const MetricCards: React.FC<MetricCardsProps> = ({
  stats,
  isLoading = false,
}) => {
  const cards = [
    {
      id: "corals",
      title: "Corals Detected",
      value: stats.total_corals_detected,
      icon: Target,
      iconBg: "bg-teal-50 text-[#0d7c85]",
      subtext: isLoading
        ? "Analyzing seabed..."
        : stats.total_corals_detected > 0
        ? "Instances Identified"
        : "No Corals Found",
      badgeVariant: "coral" as const,
    },
    {
      id: "coverage",
      title: "Reef Coverage",
      value: `${stats.coral_coverage_pct}%`,
      icon: Waves,
      iconBg: "bg-emerald-50 text-emerald-600",
      subtext: isLoading
        ? "Calculating area..."
        : `${stats.coral_covered_pixels.toLocaleString("en-US")} px total`,
      badgeVariant: "success" as const,
    },
    {
      id: "iou",
      title: "Avg IoU Confidence",
      value: stats.mean_iou_confidence.toFixed(3),
      icon: Crosshair,
      iconBg: "bg-sky-50 text-sky-600",
      subtext: isLoading
        ? "Evaluating fidelity..."
        : stats.mean_iou_confidence >= 0.7
        ? "High Fidelity"
        : "Standard Precision",
      badgeVariant: "info" as const,
    },
    {
      id: "stability",
      title: "Avg Stability Score",
      value: stats.mean_stability_score.toFixed(3),
      icon: ShieldCheck,
      iconBg: "bg-indigo-50 text-indigo-600",
      subtext: isLoading
        ? "Validating bounds..."
        : stats.mean_stability_score >= 0.8
        ? "Reliable Mask Bounds"
        : "Boundary Evaluated",
      badgeVariant: "secondary" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.id}
            className="border-slate-200 bg-white shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {c.title}
              </CardTitle>
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold font-mono tracking-tight text-[#0f1e4a]">
                {isLoading ? (
                  <ThreeDotsLoader size="sm" color="#0d7c85" />
                ) : (
                  c.value
                )}
              </div>
              <div className="mt-2 flex items-center">
                <Badge
                  variant={c.badgeVariant}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                >
                  {c.subtext}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
