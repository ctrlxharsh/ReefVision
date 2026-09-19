import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { CoralSegment, SummaryStats } from "../types";

interface SegmentsTableProps {
  segments: CoralSegment[];
  stats: SummaryStats;
  selectedSegmentId?: number | null;
  onSelectSegment?: (id: number | null) => void;
  isLoading?: boolean;
}

const columnHelper = createColumnHelper<CoralSegment>();

export const SegmentsTable: React.FC<SegmentsTableProps> = ({
  segments,
  stats,
  selectedSegmentId,
  onSelectSegment,
  isLoading = false,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "ID",
        cell: (info) => {
          const s = info.row.original;
          return (
            <div className="cell-id-badge">
              <span
                className="cell-color-dot"
                style={{ backgroundColor: s.color_hex }}
              />
              <span>{s.id_str}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("genus", {
        header: "Taxon Genus",
        cell: (info) => <span className="cell-genus">{info.getValue()}</span>,
      }),
      columnHelper.accessor("growth_form", {
        header: "Growth Form",
        cell: (info) => <span className="cell-muted">{info.getValue()}</span>,
      }),
      columnHelper.accessor("taxon_conf", {
        header: "Taxon Conf",
        cell: (info) => {
          const val = info.getValue();
          return (
            <div className="progress-cell">
              <span className="progress-num">{val.toFixed(1)}%</span>
              <div className="table-progress-bg">
                <div
                  className="table-progress-bar"
                  style={{
                    width: `${Math.min(val, 100)}%`,
                    backgroundColor: "var(--color-teal)",
                  }}
                />
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("condition", {
        header: "Condition",
        cell: (info) => {
          const cond = info.getValue();
          return (
            <span className={`badge ${cond === "Bleached" ? "badge-bleached" : "badge-healthy"}`}>
              {cond}
            </span>
          );
        },
      }),
      columnHelper.accessor("condition_conf", {
        header: "Condition Conf",
        cell: (info) => {
          const val = info.getValue();
          const cond = info.row.original.condition;
          return (
            <div className="progress-cell">
              <span className="progress-num">{val.toFixed(1)}%</span>
              <div className="table-progress-bg">
                <div
                  className="table-progress-bar"
                  style={{
                    width: `${Math.min(val, 100)}%`,
                    backgroundColor: cond === "Bleached" ? "var(--color-danger)" : "var(--color-success)",
                  }}
                />
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("area_pct", {
        header: "Area (%)",
        cell: (info) => <span className="cell-mono">{info.getValue()}%</span>,
      }),
      columnHelper.accessor("area_px", {
        header: "Area (px)",
        cell: (info) => <span className="cell-mono">{info.getValue().toLocaleString("en-US")}</span>,
      }),
      columnHelper.accessor("predicted_iou", {
        header: "IoU Confidence",
        cell: (info) => <span className="cell-mono font-bold">{info.getValue().toFixed(3)}</span>,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: segments,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="table-section">
      <div className="section-header-row">
        <h3 className="section-title">
          <span>Detected Coral Breakdown</span>
          <span className="section-counter-badge">{segments.length} Instances</span>
        </h3>
        <div className="section-meta-text">
          {isLoading ? (
            <span>Computing image metrics...</span>
          ) : (
            <span>
              Res: <code>{stats.image_resolution}</code> • Coral Area: <code>{stats.coral_covered_pixels.toLocaleString("en-US")} px</code> ({stats.coral_coverage_pct}%)
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="table-loading-box">
          <Loader2 size={28} className="loading-spinner-ring" />
          <div className="loading-title">Extracting Coral Segments & Classifying Taxonomy...</div>
          <div className="loading-subtitle">
            Segmented colonies will populate below with genus predictions, condition health, and confidence scores.
          </div>
          <div className="loading-bar-track">
            <div className="loading-bar-pulse" />
          </div>
        </div>
      ) : segments.length === 0 ? (
        <div className="table-empty-box">
          No coral segments detected with current threshold settings. Try lowering the IoU or Stability threshold in the sidebar.
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="segments-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        style={{
                          cursor: isSortable ? "pointer" : "default",
                        }}
                        onClick={header.column.getToggleSortingHandler()}
                        title={isSortable ? "Click to sort column" : undefined}
                      >
                        <div className="th-content">
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          {isSortable && (
                            <span className="th-sort-icon">
                              {sortDirection === "asc" ? (
                                <ArrowUp size={12} color="var(--color-teal)" />
                              ) : sortDirection === "desc" ? (
                                <ArrowDown size={12} color="var(--color-teal)" />
                              ) : (
                                <ArrowUpDown size={11} opacity={0.35} />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const s = row.original;
                const isSelected = selectedSegmentId === s.id;
                return (
                  <tr
                    key={row.id}
                    className={`table-row ${isSelected ? "selected-row" : ""}`}
                    onClick={() => onSelectSegment && onSelectSegment(isSelected ? null : s.id)}
                    title="Click row to focus/highlight coral on canvas"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
