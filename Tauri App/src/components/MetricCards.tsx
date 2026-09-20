import React from "react";
import { Target, Waves, Crosshair, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Corals Detected */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Corals Detected</CardTitle>
          <div className="h-7 w-7 rounded-md bg-teal-50 flex items-center justify-center text-[#0d7c85]">
            <Target className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {isLoading ? (
              <ThreeDotsLoader size="sm" color="#0d7c85" />
            ) : (
              stats.total_corals_detected
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isLoading
              ? "Analyzing seabed..."
              : stats.total_corals_detected > 0
              ? `${stats.total_corals_detected} colonies identified`
              : "0 colonies detected"}
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Reef Coverage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Reef Coverage</CardTitle>
          <div className="h-7 w-7 rounded-md bg-emerald-50 flex items-center justify-center text-[#059669]">
            <Waves className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#059669]">
            {isLoading ? (
              <ThreeDotsLoader size="sm" color="#059669" />
            ) : (
              `${stats.coral_coverage_pct}%`
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isLoading
              ? "Calculating area..."
              : stats.coral_covered_pixels > 0
              ? `${stats.coral_covered_pixels.toLocaleString("en-US")} px benthic footprint`
              : "0 px benthic footprint"}
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Avg IoU Confidence */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Avg IoU Confidence</CardTitle>
          <div className="h-7 w-7 rounded-md bg-sky-50 flex items-center justify-center text-[#0284c7]">
            <Crosshair className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {isLoading ? (
              <ThreeDotsLoader size="sm" color="#0284c7" />
            ) : (
              stats.mean_iou_confidence.toFixed(3)
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isLoading
              ? "Evaluating fidelity..."
              : stats.mean_iou_confidence >= 0.7
              ? "High Fidelity"
              : "Standard Precision"}
          </p>
        </CardContent>
      </Card>

      {/* Card 4: Avg Stability Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Avg Stability Score</CardTitle>
          <div className="h-7 w-7 rounded-md bg-indigo-50 flex items-center justify-center text-[#4f46e5]">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {isLoading ? (
              <ThreeDotsLoader size="sm" color="#4f46e5" />
            ) : (
              stats.mean_stability_score.toFixed(3)
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isLoading
              ? "Validating bounds..."
              : stats.mean_stability_score >= 0.8
              ? "Reliable Mask Bounds"
              : "Boundary Evaluated"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
