import React from "react";
import { SummaryStats } from "../types";

interface MetricCardsProps {
  stats: SummaryStats;
  isLoading?: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ stats, isLoading = false }) => {
  return (
    <div className="metric-cards-grid">
      {/* 1. Corals Found */}
      <div className="metric-card metric-card-1">
        <div className="metric-card-val">
          {isLoading ? <span className="metric-loading-skeleton">--</span> : stats.total_corals_detected}
        </div>
        <div className="metric-card-lbl">Corals Detected</div>
      </div>

      {/* 2. Reef Coverage */}
      <div className="metric-card metric-card-2">
        <div className="metric-card-val" style={{ color: "var(--color-success)" }}>
          {isLoading ? <span className="metric-loading-skeleton">--%</span> : `${stats.coral_coverage_pct}%`}
        </div>
        <div className="metric-card-lbl">
          {isLoading ? (
            "Reef Coverage"
          ) : (
            <>Reef Coverage <span className="metric-sub-val">({stats.coral_covered_pixels.toLocaleString("en-US")} px)</span></>
          )}
        </div>
      </div>

      {/* 3. Mean IoU Confidence */}
      <div className="metric-card metric-card-3">
        <div className="metric-card-val" style={{ color: "var(--color-info)" }}>
          {isLoading ? <span className="metric-loading-skeleton">--</span> : stats.mean_iou_confidence.toFixed(3)}
        </div>
        <div className="metric-card-lbl">Avg IoU Confidence</div>
      </div>

      {/* 4. Mean Stability Score */}
      <div className="metric-card metric-card-4">
        <div className="metric-card-val" style={{ color: "var(--color-purple)" }}>
          {isLoading ? <span className="metric-loading-skeleton">--</span> : stats.mean_stability_score.toFixed(3)}
        </div>
        <div className="metric-card-lbl">Avg Stability Score</div>
      </div>
    </div>
  );
};
