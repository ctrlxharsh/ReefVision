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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

const ConfBar = ({ val, color = "bg-primary" }: { val: number; color?: string }) => (
  <div className="flex items-center gap-2 min-w-[100px]">
    <Progress value={val} className="h-1.5 w-16 bg-muted" indicatorColor={color} />
    <span className="text-[11px] font-mono text-muted-foreground font-medium">
      {val.toFixed(1)}%
    </span>
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
              <span
                className="size-2.5 rounded-full ring-1 ring-black/10 shrink-0"
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
          <span className="font-semibold text-foreground">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("growth_form", {
        header: "Growth Form",
        cell: (info) => (
          <span className="text-muted-foreground font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("taxon_conf", {
        header: "Taxon Conf",
        cell: (info) => <ConfBar val={info.getValue()} color="bg-primary" />,
      }),
      columnHelper.accessor("condition", {
        header: "Condition",
        cell: (info) => {
          const cond = info.getValue();
          const isBleached = cond === "Bleached";
          return (
            <Badge
              variant={isBleached ? "destructive" : "success"}
              className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5"
            >
              {cond}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("condition_conf", {
        header: "Condition Conf",
        cell: (info) => (
          <ConfBar
            val={info.getValue()}
            color={
              info.row.original.condition === "Bleached"
                ? "bg-rose-500"
                : "bg-emerald-500"
            }
          />
        ),
      }),
      columnHelper.accessor("area_pct", {
        header: "Area (%)",
        cell: (info) => (
          <span className="font-mono text-xs font-medium text-foreground">
            {info.getValue()}%
          </span>
        ),
      }),
      columnHelper.accessor("area_px", {
        header: "Area (px)",
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue().toLocaleString("en-US")}
          </span>
        ),
      }),
      columnHelper.accessor("predicted_iou", {
        header: "IoU Confidence",
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-foreground">
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
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card className="border-border/80 bg-card shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 bg-card">
        <div>
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <span>Detected Coral Segments Breakdown</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Dense instance boundaries, taxonomy identification, and benthic condition assessment
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="font-mono text-xs bg-muted/40 text-muted-foreground border-border/80"
          >
            <span className="text-muted-foreground/60 mr-1 font-sans">Resolution:</span>
            {stats.image_resolution && stats.image_resolution !== "0x0"
              ? stats.image_resolution.replace("x", " × ")
              : "2048 × 1024"}
          </Badge>
          <Badge
            variant="outline"
            className="font-mono text-xs bg-muted/40 text-muted-foreground border-border/80"
          >
            <span className="text-muted-foreground/60 mr-1 font-sans">Coverage:</span>
            <span className="text-primary font-semibold">{stats.coral_coverage_pct}%</span>
            <span className="text-muted-foreground/60 ml-1">
              ({stats.coral_covered_pixels.toLocaleString("en-US")} px)
            </span>
          </Badge>
          <Badge variant="coral" className="text-xs font-medium px-2.5 py-0.5">
            {stats.total_corals_detected} Colonies
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading && segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Layers className="size-8 text-primary animate-pulse mb-3" />
            <div className="text-sm font-semibold text-foreground">
              Segmenting Corals & Classifying Taxa...
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Applying SAM ViT-B prompt lattice, BioCLIP taxonomic embeddings, and YOLO condition model.
            </p>
            <div className="mt-4">
              <ThreeDotsLoader size="sm" color="#0d7c85" />
            </div>
          </div>
        ) : segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Search className="size-8 mb-3 opacity-30 text-muted-foreground" />
            <div className="text-sm font-semibold text-foreground">
              No Coral Colonies Detected
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Adjust minimum mask area or IoU threshold in Analysis Controls to detect smaller colonies.
            </p>
          </div>
        ) : (
          <div className="relative w-full overflow-auto max-h-[460px]">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-xs z-10 border-b border-border">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const sortDir = header.column.getIsSorted();
                      return (
                        <TableHead
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className="h-10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            <span className="shrink-0 text-muted-foreground/60">
                              {sortDir === "asc" ? (
                                <ArrowUp className="size-3 text-primary" />
                              ) : sortDir === "desc" ? (
                                <ArrowDown className="size-3 text-primary" />
                              ) : (
                                <ArrowUpDown className="size-3 opacity-30" />
                              )}
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
                      onClick={() =>
                        onSelectSegment &&
                        onSelectSegment(isSelected ? null : row.original.id)
                      }
                      className="cursor-pointer hover:bg-primary/5 transition-colors data-[state=selected]:bg-primary/10"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-3">
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
