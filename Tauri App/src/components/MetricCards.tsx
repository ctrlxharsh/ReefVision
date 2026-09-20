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
      val: stats.total_corals_detected,
      icon: Target,
      sub: isLoading
        ? "Analyzing..."
        : stats.total_corals_detected > 0
        ? "Instances Identified"
        : "No Corals",
      badgeVariant: "coral" as const,
    },
    {
      id: "coverage",
      title: "Reef Coverage",
      val: `${stats.coral_coverage_pct}%`,
      icon: Waves,
      sub: isLoading
        ? "Calculating..."
        : `${stats.coral_covered_pixels.toLocaleString("en-US")} px total`,
      badgeVariant: "success" as const,
    },
    {
      id: "iou",
      title: "Avg IoU Confidence",
      val: stats.mean_iou_confidence.toFixed(3),
      icon: Crosshair,
      sub: isLoading
        ? "Evaluating..."
        : stats.mean_iou_confidence >= 0.7
        ? "High Fidelity"
        : "Standard Precision",
      badgeVariant: "info" as const,
    },
    {
      id: "stability",
      title: "Avg Stability Score",
      val: stats.mean_stability_score.toFixed(3),
      icon: ShieldCheck,
      sub: isLoading
        ? "Validating..."
        : stats.mean_stability_score >= 0.8
        ? "Reliable Bounds"
        : "Evaluated",
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
            className="border-border/80 bg-card shadow-xs hover:shadow-sm transition-all duration-150"
          >
            <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {c.title}
              </CardTitle>
              <div className="size-8 rounded-lg flex items-center justify-center bg-muted/60 text-muted-foreground">
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-1 flex flex-col gap-2">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground min-h-[32px] flex items-center">
                {isLoading ? (
                  <ThreeDotsLoader size="sm" color="#0d7c85" />
                ) : (
                  c.val
                )}
              </div>
              <div className="flex items-center">
                <Badge
                  variant={c.badgeVariant}
                  className="text-[11px] font-medium px-2 py-0.5"
                >
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
