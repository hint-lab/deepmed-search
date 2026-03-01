"use client";

import * as React from "react";
import type { RetrievalResponse, EvidenceItem } from "@/lib/cdp-api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EvidenceTableProps {
  data: RetrievalResponse;
}

export function EvidenceTable({ data }: EvidenceTableProps) {
  const { evidence_panel } = data;

  const sortedEvidence = React.useMemo(() => {
    return [...evidence_panel].sort((a, b) => b.score - a.score);
  }, [evidence_panel]);

  const renderScoreBadge = (item: EvidenceItem) => {
    if (item.is_rare_cue) {
      return (
        <Badge className="bg-emerald-500/90 text-white hover:bg-emerald-600">
          Rare Cue · {item.score.toFixed(2)}
        </Badge>
      );
    }
    if (item.is_generic_noise) {
      return (
        <Badge
          variant="outline"
          className="border-dashed border-muted-foreground/40 text-muted-foreground"
        >
          Noise · {item.score.toFixed(2)}
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="bg-blue-500/10 text-blue-700 dark:text-blue-300"
      >
        Relevant · {item.score.toFixed(2)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <span>Evidence Panel</span>
          <span className="text-xs font-normal text-muted-foreground">
            Total {evidence_panel.length} items
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 这里保留 ScrollArea，因为证据表不需要太长 */}
        <ScrollArea className="w-full max-h-[420px] rounded-md border bg-card/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[96px]">Score</TableHead>
                <TableHead className="w-[140px]">Source</TableHead>
                <TableHead>Content</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEvidence.map((item) => (
                <TableRow
                  key={item.id}
                  className={
                    item.is_generic_noise
                      ? "opacity-55 hover:opacity-80 transition-opacity"
                      : item.is_rare_cue
                      ? "bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40"
                      : ""
                  }
                >
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1 text-xs">
                      {renderScoreBadge(item)}
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-xs text-muted-foreground">
                    <div
                      className="font-medium text-foreground/80 truncate max-w-[140px]"
                      title={item.source}
                    >
                      {item.source}
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                      ID: {item.id}
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    <p className="leading-relaxed text-foreground/90 whitespace-pre-wrap">
                      {item.text}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}