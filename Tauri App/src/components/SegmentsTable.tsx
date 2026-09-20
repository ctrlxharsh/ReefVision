import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, Layers, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThreeDotsLoader } from "./ThreeDotsLoader";
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
          <span className="text-slate-500 font-medium">{info.getValue()}</span>
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
              <span className="text-[11px] font-mono text-slate-600 font-semibold">
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
              className="text-[10px] px-2 py-0.5 uppercase tracking-wider font-bold"
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
              <span className="text-[11px] font-mono text-slate-600 font-semibold">
                {val.toFixed(1)}%
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("area_pct", {
        header: "Area (%)",
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            {info.getValue()}%
          </span>
        ),
      }),
      columnHelper.accessor("area_px", {
        header: "Area (px)",
        cell: (info) => (
          <span className="font-mono text-xs text-slate-600">
            {info.getValue().toLocaleString("en-US")}
          </span>
        ),
      }),
      columnHelper.accessor("predicted_iou", {
        header: "IoU Confidence",
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            {info.getValue().toFixed(3)}
          </span>
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
    <Card className="shadow-xs border-slate-200/90 overflow-hidden">
      {/* Card Header with Title and Metadata */}
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 pb-4 border-b border-slate-100 bg-white">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-teal-50 text-[#0d7c85] flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold text-[#0f1e4a]">
              Detected Coral Segments Breakdown
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-1 pl-9">
            Dense instance boundaries, taxonomy identification, and health status
          </CardDescription>
        </div>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2 pl-9 sm:pl-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
            <span className="text-slate-400">Resolution:</span>
            <span className="font-mono font-semibold text-slate-800">
              {stats.image_resolution && stats.image_resolution !== "0x0"
                ? stats.image_resolution.replace("x", " × ")
                : "2048 × 1024"}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
            <span className="text-slate-400">Coverage:</span>
            <span className="font-mono font-bold text-[#0d7c85]">
              {stats.coral_coverage_pct}%
            </span>
            <span className="text-slate-400 text-[11px]">
              ({stats.coral_covered_pixels.toLocaleString("en-US")} px)
            </span>
          </div>
          <Badge variant="coral" className="px-2.5 py-1 text-xs font-semibold">
            {stats.total_corals_detected} Instances
          </Badge>
        </div>
      </CardHeader>

      {/* Card Content with Table or Loading/Empty State */}
      <CardContent className="p-0">
        {isLoading && segments.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-center bg-slate-50/40">
            <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center text-[#0d7c85]">
              <Layers className="h-5 w-5 animate-pulse" />
            </div>
            <div className="text-sm font-bold text-[#0f1e4a]">
              Segmenting Corals & Classifying Taxa...
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              Please wait while the vision models extract mask boundaries and compute health indices.
            </p>
            <div className="mt-2">
              <ThreeDotsLoader size="md" color="#0d7c85" />
            </div>
          </div>
        ) : segments.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-center bg-slate-50/40 text-slate-500">
            <Search className="h-8 w-8 text-slate-400 opacity-60" />
            <div className="text-sm font-semibold text-slate-700">No Coral Colonies Detected</div>
            <p className="text-xs text-slate-400 max-w-md">
              No coral segments detected with current parameters. Try lowering the IoU or Stability threshold in the sidebar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 shadow-2xs">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-slate-200">
                    {headerGroup.headers.map((header) => {
                      const isSortable = header.column.getCanSort();
                      const sortDir = header.column.getIsSorted();
                      return (
                        <TableHead
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className={`h-9 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                            isSortable ? "cursor-pointer select-none hover:bg-slate-100 transition-colors" : ""
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {isSortable && (
                              <span className="shrink-0 text-slate-400">
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
                      className="cursor-pointer hover:bg-teal-50/30 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-2.5">
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
      </CardContent>
    </Card>
  );
};
