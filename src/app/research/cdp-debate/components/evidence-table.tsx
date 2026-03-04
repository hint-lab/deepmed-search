"use client";

import * as React from "react";
import type { RetrievalResponse, EvidenceItem } from "@/lib/cdp-api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslate } from "@/contexts/language-context";

interface EvidenceTableProps {
  data: RetrievalResponse;
  onEvidenceSelect?: (index: number) => void;
}

export function EvidenceTable({ data, onEvidenceSelect }: EvidenceTableProps) {
  const { t } = useTranslate("cdp-debate");
  const { evidence_panel } = data;

  const sortedEvidence = React.useMemo(() => {
    return [...evidence_panel]
      .filter(item => item.score >= 0.2)
      .sort((a, b) => b.score - a.score);
  }, [evidence_panel]);

  const renderScoreBadge = (item: EvidenceItem) => {
    if (item.is_rare_cue) {
      return (
        <Badge className="bg-emerald-500/90 text-white hover:bg-emerald-600">
          {t('rareCue')} · {item.score.toFixed(2)}
        </Badge>
      );
    }
    if (item.is_generic_noise) {
      return (
        <Badge
          variant="outline"
          className="border-dashed border-muted-foreground/40 text-muted-foreground"
        >
          {t('noise')} · {item.score.toFixed(2)}
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="bg-blue-500/10 text-blue-700 dark:text-blue-300"
      >
        {t('relevant')} · {item.score.toFixed(2)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <span>{t('evidencePanel')}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {t('totalItems', { count: sortedEvidence.length })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 让表格根据内容自动扩展高度 */}
        <div className="w-full rounded-md border bg-card/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[96px]">{t('score')}</TableHead>
                <TableHead className="w-[140px]">{t('source')}</TableHead>
                <TableHead>{t('content')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEvidence.map((item, index) => (
                <TableRow
                  key={item.id}
                  onClick={() => {
                    // 使用原始索引 (originalIndex) 来对应后端的 path_id
                    const pathId = item.originalIndex ?? index;
                    onEvidenceSelect?.(pathId);
                  }}
                  className={
                    "cursor-pointer transition-colors hover:bg-muted/50 " +
                    (
                    item.is_generic_noise
                      ? "opacity-55 hover:opacity-80 transition-opacity"
                      : item.is_rare_cue
                      ? "bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40"
                      : ""
                    )
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
        </div>
      </CardContent>
    </Card>
  );
}