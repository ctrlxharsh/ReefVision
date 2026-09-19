import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
            <div className="table-id-cell">
              <span className="table-color-dot" style={{ backgroundColor: s.color_hex }} />
              <span>{s.id_str}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("genus", {
        header: "Taxon Genus",
        cell: (info) => <span style={{ fontWeight: 600 }}>{info.getValue()}</span>,
      }),
      columnHelper.accessor("growth_form", {
        header: "Growth Form",
        cell: (info) => <span style={{ color: "#64748b" }}>{info.getValue()}</span>,
      }),
      columnHelper.accessor("taxon_conf", {
        header: "Taxon Conf",
        cell: (info) => {
          const val = info.getValue();
          return (
            <div className="table-prog-cell">
              <div className="table-prog-track">
                <div
                  className="table-prog-fill"
                  style={{ width: `${Math.min(val, 100)}%`, backgroundColor: "#0d7c85" }}
                />
              </div>
              <span className="table-prog-val">{val.toFixed(1)}%</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("condition", {
        header: "Condition",
        cell: (info) => {
          const cond = info.getValue();
          return (
            <span className={cond === "Bleached" ? "badge-bleached" : "badge-healthy"}>
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
            <div className="table-prog-cell">
              <div className="table-prog-track">
                <div
                  className="table-prog-fill"
                  style={{
                    width: `${Math.min(val, 100)}%`,
                    backgroundColor: cond === "Bleached" ? "#dc2626" : "#059669",
                  }}
                />
              </div>
              <span className="table-prog-val">{val.toFixed(1)}%</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("area_pct", {
        header: "Area (%)",
        cell: (info) => <span className="mono-val">{info.getValue()}%</span>,
      }),
      columnHelper.accessor("area_px", {
        header: "Area (px)",
        cell: (info) => <span className="mono-val">{info.getValue().toLocaleString("en-US")}</span>,
      }),
      columnHelper.accessor("predicted_iou", {
        header: "IoU Confidence",
        cell: (info) => <span className="mono-val font-semibold">{info.getValue().toFixed(3)}</span>,
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
    <div className="table-section-container">
      <div className="section-header">
        <span>📊</span>
        <span>Detected Coral Segments Breakdown</span>
      </div>
      <div className="sub-caption-text">
        Resolution: <code>{stats.image_resolution || "2048x1024"}</code> | Coral Pixels:{" "}
        <code>{stats.coral_covered_pixels.toLocaleString("en-US")}</code> ({stats.coral_coverage_pct}%) | Total Instances:{" "}
        <code>{stats.total_corals_detected}</code>
      </div>

      {isLoading && segments.length === 0 ? (
        <div className="table-frame">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Taxon Genus</th>
                <th>Growth Form</th>
                <th>Taxon Conf</th>
                <th>Condition</th>
                <th>Condition Conf</th>
                <th>Area (%)</th>
                <th>Area (px)</th>
                <th>IoU Confidence</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="skeleton-tr">
                  <td colSpan={9}>
                    <div className="table-skeleton-bar" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : segments.length === 0 ? (
        <div className="table-empty-notice">
          No coral segments detected with current threshold settings. Try lowering the IoU or Stability threshold in the sidebar.
        </div>
      ) : (
        <div className="table-frame">
          <table className="custom-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        style={{ cursor: isSortable ? "pointer" : "default" }}
                      >
                        <div className="th-flex">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {isSortable && (
                            <span className="th-sort-arrow">
                              {sortDir === "asc" ? (
                                <ArrowUp size={13} color="#0d7c85" />
                              ) : sortDir === "desc" ? (
                                <ArrowDown size={13} color="#0d7c85" />
                              ) : (
                                <ArrowUpDown size={11} opacity={0.3} />
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
                    className={`table-row-item ${isSelected ? "selected" : ""}`}
                    onClick={() => onSelectSegment && onSelectSegment(isSelected ? null : s.id)}
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
