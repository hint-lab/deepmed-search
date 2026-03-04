"use client";

import * as React from "react";
import type { DebateResponse, DebateLog } from "@/lib/cdp-api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
// 注意：删除了 ScrollArea 的引用，因为我们要用原生 div 做弹性容器

interface DebateVisualizationProps {
  data: DebateResponse;
  selectedPathIndex?: number;
}

export function DebateVisualization({ data, selectedPathIndex }: DebateVisualizationProps) {
  const { t } = useTranslation("cdp-debate");
  const { debate_logs, diagnosis, confidence, reasoning_trace } = data;

  const sortedLogs: DebateLog[] = React.useMemo(() => {
    return [...debate_logs].sort(
      (a, b) => (b.final_confidence ?? 0) - (a.final_confidence ?? 0),
    );
  }, [debate_logs]);

  // 如果指定了 selectedPathIndex，则显示对应的辩论；否则显示置信度最高的
  const mainLog = selectedPathIndex !== undefined 
    ? sortedLogs.find(log => log.path_id === selectedPathIndex) ?? sortedLogs[0]
    : sortedLogs[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>{t('debateProcess')}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {/* 删掉了 Mode 显示 */}
              <span>{t('paths')}: {debate_logs.length}</span>
              <span>·</span>
              <span>{t('confidence')}: {(confidence * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div className="flex min-w-[180px] flex-col items-end gap-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('modelDiagnosis')}
            </div>
            <div className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              {diagnosis === 'Positive' ? t('positive') : diagnosis === 'Negative' ? t('negative') : diagnosis}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              {t('pathConfidence')}: {(confidence * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 这里的布局改为自适应高度 */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          
          {/* 左侧：主辩论路径 (弹性容器，由内容撑开) */}
          <div className="space-y-3 rounded-md border bg-card/40 p-4">
            {mainLog ? (
              mainLog.history.map((round, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-semibold text-white">
                      P
                    </div>
                    <div className="flex-1 rounded-2xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 dark:bg-blue-900/30">
                      <div className="mb-1 text-[11px] font-semibold text-blue-600 dark:text-blue-300">
                        {t('proponent')}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {round.proponent}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start justify-end gap-3">
                    <div className="flex-1 rounded-2xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-right dark:bg-rose-900/25">
                      <div className="mb-1 text-right text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                        {t('opponent')}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {round.opponent}
                      </p>
                    </div>
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
                      O
                    </div>
                  </div>
                  <div className="my-1 flex justify-center">
                    <div className="h-px w-10 bg-border" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t('noDebate')}</p>
            )}
            {mainLog && (
              <div className="mt-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                <Badge
                  variant="outline"
                  className="border-emerald-500/70 text-emerald-600 dark:text-emerald-300"
                >
                  Path Confidence: {(mainLog.final_confidence * 100).toFixed(1)}%
                </Badge>
              </div>
            )}
          </div>

          {/* Right: Reasoning Trace + Others (右侧也让它自然生长) */}
          <div className="space-y-4 h-fit">
            <Card className="border-muted-foreground/20 bg-muted/40">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold">
                  {t('reasoningTrace')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 pb-3">
                <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                  {reasoning_trace.map((step, idx) => (
                    <li key={idx} className="whitespace-pre-wrap">
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {debate_logs.length > 1 && (
              <Card className="border-muted-foreground/20 bg-muted/30">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-semibold">
                    {t('otherPaths')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2 pb-3">
                  <div className="space-y-2">
                    {sortedLogs.slice(1).map((log, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span>Path #{log.path_id ?? idx + 2}</span>
                        <span>
                          Conf: {(log.final_confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}