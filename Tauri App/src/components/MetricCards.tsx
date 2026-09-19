import React from "react";
import { SummaryStats } from "../types";

interface MetricCardsProps {
  stats: SummaryStats;
  isLoading?: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ stats, isLoading = false }) => {
  return (
    <div className="metric-cards-row">
      {/* Card 1: Corals Found */}
      <div className="metric-card metric-card-1">
        <div className="metric-card-val">
          {isLoading && stats.total_corals_detected === 0 ? (
            <span className="metric-skeleton">•••</span>
          ) : (
            stats.total_corals_detected
          )}
        </div>
        <div className="metric-card-lbl">Corals Found</div>
      </div>

      {/* Card 2: Reef Coverage */}
      <div className="metric-card metric-card-2">
        <div className="metric-card-val" style={{ color: "#059669" }}>
          {isLoading && stats.coral_coverage_pct === 0 ? (
            <span className="metric-skeleton">•••%</span>
          ) : (
            `${stats.coral_coverage_pct}%`
          )}
        </div>
        <div className="metric-card-lbl">
          {stats.coral_covered_pixels > 0
            ? `Reef Coverage (${stats.coral_covered_pixels.toLocaleString("en-US")} px)`
            : "Reef Coverage"}
        </div>
      </div>

      {/* Card 3: Avg IoU Confidence */}
      <div className="metric-card metric-card-3">
        <div className="metric-card-val" style={{ color: "#0284c7" }}>
          {isLoading && stats.mean_iou_confidence === 0 ? (
            <span className="metric-skeleton">•••</span>
          ) : (
            stats.mean_iou_confidence.toFixed(3)
          )}
        </div>
        <div className="metric-card-lbl">Avg IoU Confidence</div>
      </div>

      {/* Card 4: Avg Stability Score */}
      <div className="metric-card metric-card-4">
        <div className="metric-card-val" style={{ color: "#4f46e5" }}>
          {isLoading && stats.mean_stability_score === 0 ? (
            <span className="metric-skeleton">•••</span>
          ) : (
            stats.mean_stability_score.toFixed(3)
          )}
        </div>
        <div className="metric-card-lbl">Avg Stability Score</div>
      </div>
    </div>
  );
};
