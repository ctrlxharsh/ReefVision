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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Card 1: Corals Detected */}
      <Card className="border-t-2 border-t-[#0d7c85] border-slate-200 bg-white shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Corals Detected
          </CardTitle>
          <div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center text-[#0d7c85]">
            <Target className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#0f1e4a]">
            {isLoading ? (
              <ThreeDotsLoader size="sm" color="#0d7c85" />
            ) : (
              stats.total_corals_detected
            )}
          </div>
          <div className="mt-2 flex items-center">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {isLoading
                ? "Analyzing seabed..."
                : stats.total_corals_detected > 0
                ? "Instances Identified"
                : "Analyzing seabed"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Reef Coverage */}
      <Card className="border-t-2 border-t-[#059669] border-slate-200 bg-white shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Reef Coverage
          </CardTitle>
          <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-[#059669]">
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
          <div className="mt-2 flex items-center">
            <span className="text-[11px] text-slate-500 font-mono font-medium">
              {isLoading
                ? "Calculating area..."
                : `${stats.coral_covered_pixels.toLocaleString("en-US")} px total`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Avg IoU Confidence */}
      <Card className="border-t-2 border-t-[#0284c7] border-slate-200 bg-white shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Avg IoU Confidence
          </CardTitle>
          <div className="h-7 w-7 rounded-lg bg-sky-50 flex items-center justify-center text-[#0284c7]">
            <Crosshair className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#0284c7]">
            {isLoading ? (
              <ThreeDotsLoader size="sm" color="#0284c7" />
            ) : (
              stats.mean_iou_confidence.toFixed(3)
            )}
          </div>
          <div className="mt-2 flex items-center">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-[#0284c7] border border-sky-200">
              {isLoading
                ? "Evaluating fidelity..."
                : stats.mean_iou_confidence >= 0.7
                ? "High Fidelity"
                : "Standard Precision"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Avg Stability Score */}
      <Card className="border-t-2 border-t-[#4f46e5] border-slate-200 bg-white shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Avg Stability Score
          </CardTitle>
          <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center text-[#4f46e5]">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#4f46e5]">
            {isLoading ? (
              <ThreeDotsLoader size="sm" color="#4f46e5" />
            ) : (
              stats.mean_stability_score.toFixed(3)
            )}
          </div>
          <div className="mt-2 flex items-center">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-[#4f46e5] border border-indigo-200">
              {isLoading
                ? "Validating bounds..."
                : stats.mean_stability_score >= 0.8
                ? "Reliable Mask Bounds"
                : "Boundary Evaluated"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
