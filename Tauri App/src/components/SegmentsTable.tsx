import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, Layers } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
            <div className="flex items-center gap-2 font-mono text-xs font-semibold">
              <span
                className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10 shrink-0"
                style={{ backgroundColor: s.color_hex }}
              />
              <span>{s.id_str}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("genus", {
        header: "Taxon Genus",
        cell: (info) => (
          <span className="font-semibold text-slate-900">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("growth_form", {
        header: "Growth Form",
        cell: (info) => (
          <span className="text-slate-500">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("taxon_conf", {
        header: "Taxon Conf",
        cell: (info) => {
          const val = info.getValue();
          return (
            <div className="flex items-center gap-2 min-w-[100px]">
              <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden shrink-0">
                <div
                  className="h-full bg-[#0d7c85]"
                  style={{ width: `${Math.min(val, 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-600">
                {val.toFixed(1)}%
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("condition", {
        header: "Condition",
        cell: (info) => {
          const cond = info.getValue();
          return (
            <Badge
              variant={cond === "Bleached" ? "destructive" : "success"}
              className="text-[10px] uppercase tracking-wider font-bold"
            >
              {cond}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("condition_conf", {
        header: "Condition Conf",
        cell: (info) => {
          const val = info.getValue();
          const cond = info.row.original.condition;
          return (
            <div className="flex items-center gap-2 min-w-[100px]">
              <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden shrink-0">
                <div
                  className={`h-full ${
                    cond === "Bleached" ? "bg-red-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(val, 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-600">
                {val.toFixed(1)}%
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("area_pct", {
        header: "Area (%)",
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue()}%</span>
        ),
      }),
      columnHelper.accessor("area_px", {
        header: "Area (px)",
        cell: (info) => (
          <span className="font-mono text-xs">
            {info.getValue().toLocaleString("en-US")}
          </span>
        ),
      }),
      columnHelper.accessor("predicted_iou", {
        header: "IoU Confidence",
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue().toFixed(3)}</span>
        ),
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
    <Card className="my-4 p-5">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <Layers className="h-4 w-4 text-[#0d7c85]" />
        <h3 className="font-bold text-[#0f1e4a] text-sm tracking-tight">
          Detected Coral Segments Breakdown
        </h3>
      </div>

      {/* Meta Bar */}
      <div className="flex flex-wrap items-center gap-2 my-3">
        <Badge variant="outline" className="bg-slate-50 text-slate-600 font-normal">
          <span className="font-semibold text-slate-800 mr-1.5">Resolution:</span>
          <span className="font-mono text-[11px]">
            {stats.image_resolution
              ? stats.image_resolution.replace("x", " × ")
              : "2048 × 1024"}
          </span>
        </Badge>
        <Badge variant="outline" className="bg-slate-50 text-slate-600 font-normal">
          <span className="font-semibold text-slate-800 mr-1.5">Coral Coverage:</span>
          <span className="font-bold text-[#0d7c85] mr-1">
            {stats.coral_coverage_pct}%
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            ({stats.coral_covered_pixels.toLocaleString("en-US")} px)
          </span>
        </Badge>
        <Badge variant="coral" className="font-semibold">
          <span>Total Instances:</span>
          <span className="ml-1 font-mono font-bold text-[#0d7c85]">
            {stats.total_corals_detected}
          </span>
        </Badge>
      </div>

      {isLoading && segments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Taxon Genus</TableHead>
                <TableHead>Growth Form</TableHead>
                <TableHead>Taxon Conf</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Condition Conf</TableHead>
                <TableHead>Area (%)</TableHead>
                <TableHead>Area (px)</TableHead>
                <TableHead>IoU Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : segments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
          No coral segments detected with current threshold settings. Try lowering the IoU or Stability threshold in the sidebar.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden max-h-[420px] overflow-y-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={isSortable ? "cursor-pointer select-none hover:bg-slate-100/80 transition-colors" : ""}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {isSortable && (
                            <span className="shrink-0">
                              {sortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-[#0d7c85]" />
                              ) : sortDir === "desc" ? (
                                <ArrowDown className="h-3 w-3 text-[#0d7c85]" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-30" />
                              )}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => {
                const s = row.original;
                const isSelected = selectedSegmentId === s.id;
                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected ? "selected" : undefined}
                    onClick={() =>
                      onSelectSegment &&
                      onSelectSegment(isSelected ? null : s.id)
                    }
                    className="cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
};
