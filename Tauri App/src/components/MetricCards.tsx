import React from "react";
import { Target, Waves, Crosshair, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Corals Detected */}
      <Card className="shadow-xs hover:shadow-sm transition-all border-slate-200/90 flex flex-col justify-between">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Corals Detected
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-teal-50 text-[#0d7c85] flex items-center justify-center shrink-0">
            <Target className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {isLoading ? (
              <ThreeDotsLoader size="sm" color="#0d7c85" />
            ) : (
              stats.total_corals_detected
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center">
              {isLoading ? (
                <span className="text-xs text-slate-400">Analyzing seabed...</span>
              ) : stats.total_corals_detected > 0 ? (
                <Badge variant="coral" className="text-[11px] px-2 py-0.5 font-medium">
                  {stats.total_corals_detected} Colonies Identified
                </Badge>
              ) : (
                <span className="text-xs text-slate-400">0 Colonies Detected</span>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-0.5">
              <span>Total pixels</span>
              <span className="font-semibold text-slate-700">
                {isLoading
                  ? "—"
                  : stats.total_image_pixels
                  ? `${stats.total_image_pixels.toLocaleString("en-US")} px`
                  : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Reef Coverage */}
      <Card className="shadow-xs hover:shadow-sm transition-all border-slate-200/90 flex flex-col justify-between">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Reef Coverage
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Waves className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600">
            {isLoading ? (
              <ThreeDotsLoader size="sm" color="#059669" />
            ) : (
              `${stats.coral_coverage_pct}%`
            )}
          </div>
          <div className="space-y-1.5">
            <Progress
              value={isLoading ? 0 : Math.min(coveragePercent, 100)}
              className="h-1.5 bg-slate-100"
              indicatorColor="bg-emerald-500"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Benthic footprint</span>
              <span className="font-semibold text-slate-700">
                {isLoading
                  ? "Calculating..."
                  : `${stats.coral_covered_pixels.toLocaleString("en-US")} px`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Avg IoU Confidence */}
      <Card className="shadow-xs hover:shadow-sm transition-all border-slate-200/90 flex flex-col justify-between">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Avg IoU Confidence
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Crosshair className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {isLoading ? (
              <ThreeDotsLoader size="sm" color="#0284c7" />
            ) : (
              stats.mean_iou_confidence.toFixed(3)
            )}
          </div>
          <div className="space-y-1.5">
            <Progress
              value={isLoading ? 0 : Math.min(stats.mean_iou_confidence * 100, 100)}
              className="h-1.5 bg-slate-100"
              indicatorColor="bg-sky-500"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Fidelity rating</span>
              <span className="font-semibold text-slate-700">
                {isLoading
                  ? "Evaluating..."
                  : stats.mean_iou_confidence >= 0.7
                  ? "High Fidelity"
                  : "Standard Precision"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Avg Stability Score */}
      <Card className="shadow-xs hover:shadow-sm transition-all border-slate-200/90 flex flex-col justify-between">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Avg Stability Score
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {isLoading ? (
              <ThreeDotsLoader size="sm" color="#4f46e5" />
            ) : (
              stats.mean_stability_score.toFixed(3)
            )}
          </div>
          <div className="space-y-1.5">
            <Progress
              value={isLoading ? 0 : Math.min(stats.mean_stability_score * 100, 100)}
              className="h-1.5 bg-slate-100"
              indicatorColor="bg-indigo-500"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Boundary stability</span>
              <span className="font-semibold text-slate-700">
                {isLoading
                  ? "Validating..."
                  : stats.mean_stability_score >= 0.8
                  ? "Reliable Bounds"
                  : "Evaluated Bounds"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
