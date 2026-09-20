import React from "react";
import { Target, Waves, Crosshair, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  const coveragePercent = stats.coral_coverage_pct || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-3.5">
      {/* Card 1: Corals Detected */}
      <Card className="border-t-[3px] border-t-[#0d7c85] p-4.5 flex flex-col justify-between transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Corals Detected
          </span>
          <div className="h-8 w-8 rounded-lg bg-teal-50 text-[#0d7c85] flex items-center justify-center">
            <Target className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-[#0f1e4a] my-2 font-mono">
          {isLoading ? (
            <ThreeDotsLoader size="sm" color="#0d7c85" />
          ) : (
            stats.total_corals_detected
          )}
        </div>
        <div className="mt-auto">
          <Badge
            variant="coral"
            className="text-[10px] font-semibold tracking-wide"
          >
            {isLoading
              ? "Analyzing seabed..."
              : stats.total_corals_detected > 0
              ? "Instances Identified"
              : "Analyzing seabed"}
          </Badge>
        </div>
      </Card>

      {/* Card 2: Reef Coverage */}
      <Card className="border-t-[3px] border-t-emerald-600 p-4.5 flex flex-col justify-between transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Reef Coverage
          </span>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Waves className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-emerald-600 my-2 font-mono">
          {isLoading ? (
            <ThreeDotsLoader size="sm" color="#059669" />
          ) : (
            `${stats.coral_coverage_pct}%`
          )}
        </div>
        <div className="mt-auto space-y-1.5">
          <Progress
            value={isLoading ? 0 : Math.min(coveragePercent, 100)}
            className="h-1.5 bg-slate-100"
            indicatorColor="bg-emerald-500"
          />
          <div className="text-[11px] text-slate-400 font-mono">
            {isLoading
              ? "Calculating area..."
              : stats.coral_covered_pixels > 0
              ? `${stats.coral_covered_pixels.toLocaleString("en-US")} px total`
              : "0 px"}
          </div>
        </div>
      </Card>

      {/* Card 3: Avg IoU Confidence */}
      <Card className="border-t-[3px] border-t-sky-600 p-4.5 flex flex-col justify-between transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Avg IoU Confidence
          </span>
          <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <Crosshair className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-sky-600 my-2 font-mono">
          {isLoading ? (
            <ThreeDotsLoader size="sm" color="#0284c7" />
          ) : (
            stats.mean_iou_confidence.toFixed(3)
          )}
        </div>
        <div className="mt-auto">
          <Badge
            variant={stats.mean_iou_confidence >= 0.7 ? "info" : "secondary"}
            className="text-[10px] font-semibold tracking-wide"
          >
            {isLoading
              ? "Evaluating fidelity..."
              : stats.mean_iou_confidence >= 0.7
              ? "High Fidelity"
              : "Standard Precision"}
          </Badge>
        </div>
      </Card>

      {/* Card 4: Avg Stability Score */}
      <Card className="border-t-[3px] border-t-indigo-600 p-4.5 flex flex-col justify-between transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Avg Stability Score
          </span>
          <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-indigo-600 my-2 font-mono">
          {isLoading ? (
            <ThreeDotsLoader size="sm" color="#4f46e5" />
          ) : (
            stats.mean_stability_score.toFixed(3)
          )}
        </div>
        <div className="mt-auto">
          <Badge
            variant={stats.mean_stability_score >= 0.8 ? "default" : "secondary"}
            className={
              stats.mean_stability_score >= 0.8
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold tracking-wide"
                : "text-[10px] font-semibold tracking-wide"
            }
          >
            {isLoading
              ? "Validating bounds..."
              : stats.mean_stability_score >= 0.8
              ? "Reliable Mask Bounds"
              : "Boundary Evaluated"}
          </Badge>
        </div>
      </Card>
    </div>
  );
};
