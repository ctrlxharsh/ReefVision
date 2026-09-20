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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ThreeDotsLoader } from "./ThreeDotsLoader";
import { CoralSegment, SummaryStats } from "../types";
import { cn } from "@/lib/utils";

interface SegmentsTableProps {
  segments: CoralSegment[];
  stats: SummaryStats;
  selectedSegmentId?: number | null;
  onSelectSegment?: (id: number | null) => void;
  isLoading?: boolean;
}

const columnHelper = createColumnHelper<CoralSegment>();

const ConfBar = ({ val, color = "bg-[#0d7c85]" }: { val: number; color?: string }) => (
  <div className="flex items-center gap-2 min-w-[100px]">
    <Progress value={val} className="h-1.5 w-16 bg-slate-100" indicatorColor={color} />
    <span className="text-[11px] font-mono text-slate-600 font-semibold">{val.toFixed(1)}%</span>
  </div>
);

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
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10 shrink-0" style={{ backgroundColor: s.color_hex }} />
              <span>{s.id_str}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("genus", {
        header: "Taxon Genus",
        cell: (info) => <span className="font-semibold text-slate-900">{info.getValue()}</span>,
      }),
      columnHelper.accessor("growth_form", {
        header: "Growth Form",
        cell: (info) => <span className="text-slate-500 font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor("taxon_conf", {
        header: "Taxon Conf",
        cell: (info) => <ConfBar val={info.getValue()} color="bg-[#0d7c85]" />,
      }),
      columnHelper.accessor("condition", {
        header: "Condition",
        cell: (info) => {
          const cond = info.getValue();
          const isBleached = cond === "Bleached";
          return (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border",
                isBleached
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}
            >
              {cond}
            </span>
          );
        },
      }),
      columnHelper.accessor("condition_conf", {
        header: "Condition Conf",
        cell: (info) => (
          <ConfBar
            val={info.getValue()}
            color={info.row.original.condition === "Bleached" ? "bg-rose-500" : "bg-emerald-500"}
          />
        ),
      }),
      columnHelper.accessor("area_pct", {
        header: "Area (%)",
        cell: (info) => <span className="font-mono text-xs font-semibold text-slate-800">{info.getValue()}%</span>,
      }),
      columnHelper.accessor("area_px", {
        header: "Area (px)",
        cell: (info) => <span className="font-mono text-xs text-slate-600">{info.getValue().toLocaleString("en-US")}</span>,
      }),
      columnHelper.accessor("predicted_iou", {
        header: "IoU Confidence",
        cell: (info) => <span className="font-mono text-xs font-semibold text-slate-800">{info.getValue().toFixed(3)}</span>,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: segments,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card className="border-slate-200/90 bg-white shadow-xs rounded-xl overflow-hidden">
      <CardHeader className="py-3 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 bg-slate-50/60">
        <div>
          <CardTitle className="text-sm font-bold text-[#0f1e4a] flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#0d7c85]" />
            <span>Detected Coral Segments Breakdown</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Dense instance boundaries, taxonomy identification, and health status
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs bg-white text-slate-600 border-slate-200">
            <span className="text-slate-400 mr-1 font-sans">Resolution:</span>
            {stats.image_resolution && stats.image_resolution !== "0x0" ? stats.image_resolution.replace("x", " × ") : "2048 × 1024"}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs bg-white text-slate-600 border-slate-200">
            <span className="text-slate-400 mr-1 font-sans">Coverage:</span>
            <span className="text-[#0d7c85] font-semibold">{stats.coral_coverage_pct}%</span>
            <span className="text-slate-400 ml-1">({stats.coral_covered_pixels.toLocaleString("en-US")} px)</span>
          </Badge>
          <Badge variant="coral" className="text-xs">{stats.total_corals_detected} Instances</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading && segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Layers className="h-8 w-8 text-[#0d7c85] animate-pulse mb-2" />
            <div className="text-sm font-semibold text-slate-800">Segmenting Corals & Classifying Taxa...</div>
            <div className="mt-3"><ThreeDotsLoader size="sm" color="#0d7c85" /></div>
          </div>
        ) : segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Search className="h-8 w-8 mb-2 opacity-40 text-slate-400" />
            <div className="text-sm font-semibold text-slate-700">No Coral Colonies Detected</div>
          </div>
        ) : (
          <div className="relative w-full overflow-auto max-h-[460px]">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur z-10 border-b border-slate-200">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const sortDir = header.column.getIsSorted();
                      return (
                        <TableHead
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className="h-9 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span className="shrink-0 text-slate-400">
                              {sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-[#0d7c85]" /> : sortDir === "desc" ? <ArrowDown className="h-3 w-3 text-[#0d7c85]" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                            </span>
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  const isSelected = selectedSegmentId === row.original.id;
                  return (
                    <TableRow
                      key={row.id}
                      data-state={isSelected ? "selected" : undefined}
                      onClick={() => onSelectSegment && onSelectSegment(isSelected ? null : row.original.id)}
                      className="cursor-pointer hover:bg-teal-50/30 transition-colors data-[state=selected]:bg-teal-50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-2.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
