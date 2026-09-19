import React from "react";
import { Target, Waves, Crosshair, ShieldCheck } from "lucide-react";
import { ThreeDotsLoader } from "./ThreeDotsLoader";
import { SummaryStats } from "../types";

interface MetricCardsProps {
  stats: SummaryStats;
  isLoading?: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ stats, isLoading = false }) => {
  const coveragePercent = stats.coral_coverage_pct || 0;

  return (
    <div className="metric-cards-row">
      {/* Card 1: Corals Found */}
      <div className="metric-card metric-card-1">
        <div className="metric-card-top">
          <span className="metric-card-lbl">Corals Detected</span>
          <div className="metric-card-icon-wrap icon-corals">
            <Target size={16} />
          </div>
        </div>
        <div className="metric-card-val">
          {isLoading ? (
            <ThreeDotsLoader size="sm" color="#0d7c85" />
          ) : (
            stats.total_corals_detected
          )}
        </div>
        <div className="metric-card-footer">
          <span className="metric-pill pill-corals">
            {isLoading
              ? "Analyzing seabed..."
              : stats.total_corals_detected > 0
              ? "Instances Identified"
              : "Analyzing seabed"}
          </span>
        </div>
      </div>

      {/* Card 2: Reef Coverage */}
      <div className="metric-card metric-card-2">
        <div className="metric-card-top">
          <span className="metric-card-lbl">Reef Coverage</span>
          <div className="metric-card-icon-wrap icon-coverage">
            <Waves size={16} />
          </div>
        </div>
        <div className="metric-card-val val-coverage">
          {isLoading ? (
            <ThreeDotsLoader size="sm" color="#059669" />
          ) : (
            `${stats.coral_coverage_pct}%`
          )}
        </div>
        <div className="metric-card-footer">
          <div className="metric-progress-wrap">
            <div
              className="metric-progress-bar"
              style={{ width: `${isLoading ? 0 : Math.min(coveragePercent, 100)}%` }}
            />
          </div>
          <span className="metric-subtext">
            {isLoading
              ? "Calculating area..."
              : stats.coral_covered_pixels > 0
              ? `${stats.coral_covered_pixels.toLocaleString("en-US")} px total`
              : "0 px"}
          </span>
        </div>
      </div>

      {/* Card 3: Avg IoU Confidence */}
      <div className="metric-card metric-card-3">
        <div className="metric-card-top">
          <span className="metric-card-lbl">Avg IoU Confidence</span>
          <div className="metric-card-icon-wrap icon-iou">
            <Crosshair size={16} />
          </div>
        </div>
        <div className="metric-card-val val-iou">
          {isLoading ? (
            <ThreeDotsLoader size="sm" color="#0284c7" />
          ) : (
            stats.mean_iou_confidence.toFixed(3)
          )}
        </div>
        <div className="metric-card-footer">
          <span
            className={`metric-pill ${
              stats.mean_iou_confidence >= 0.7 ? "pill-quality-high" : "pill-quality-mid"
            }`}
          >
            {isLoading
              ? "Evaluating fidelity..."
              : stats.mean_iou_confidence >= 0.7
              ? "High Fidelity"
              : "Standard Precision"}
          </span>
        </div>
      </div>

      {/* Card 4: Avg Stability Score */}
      <div className="metric-card metric-card-4">
        <div className="metric-card-top">
          <span className="metric-card-lbl">Avg Stability Score</span>
          <div className="metric-card-icon-wrap icon-stability">
            <ShieldCheck size={16} />
          </div>
        </div>
        <div className="metric-card-val val-stability">
          {isLoading ? (
            <ThreeDotsLoader size="sm" color="#4f46e5" />
          ) : (
            stats.mean_stability_score.toFixed(3)
          )}
        </div>
        <div className="metric-card-footer">
          <span
            className={`metric-pill ${
              stats.mean_stability_score >= 0.8 ? "pill-quality-high" : "pill-quality-mid"
            }`}
          >
            {isLoading
              ? "Validating bounds..."
              : stats.mean_stability_score >= 0.8
              ? "Reliable Mask Bounds"
              : "Boundary Evaluated"}
          </span>
        </div>
      </div>
    </div>
  );
};
