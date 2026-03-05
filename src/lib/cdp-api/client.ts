/**
 * CDP API Client
 * Used to call CDP backend /retrieve/context and /debate/validate endpoints
 */

import {
  RetrieveContextRequest,
  RetrieveContextResponse,
  DebateValidateRequest,
  DebateValidateResponse,
  RetrievalResponse,
  DebateResponse,
  CDPApiOptions,
} from './types';

/**
 * Get CDP API Base URL
 * Prioritize environment variables, default to remote CDP service
 */
const getCDPApiBase = (): string => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_CDP_API_URL || 'http://10.7.4.6:7777';
  }
  return process.env.CDP_API_URL || process.env.NEXT_PUBLIC_CDP_API_URL || 'http://10.7.4.6:7777';
};

const CDP_API_BASE = getCDPApiBase();

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function mapRetrieveContextToRetrievalResponse(data: RetrieveContextResponse): RetrievalResponse {
  const rerankedResults = data?.results?.reranked?.results ?? [];
  const evidencePanel = rerankedResults.map((item, index) => ({
    id: `${item.file || 'path'}_${index}`,
    text: item.document ?? '',
    score: normalizeNumber(item.score),
    source: item.file ?? 'unknown',
    is_generic_noise: false,
    is_rare_cue: false,
  }));

  const stepTime =
    normalizeNumber(data?.timing?.hybrid_seconds) +
    normalizeNumber(data?.timing?.graph_seconds) +
    normalizeNumber(data?.timing?.reasoning_seconds);

  return {
    pseudo_questions: [],
    evidence_panel: evidencePanel,
    graph_data: { nodes: [], edges: [] },
    mode: 'deepmed',
    step_time: stepTime,
  };
}

function parseFinalAnswer(finalAnswer: string): { diagnosis: string; reasoningTrace: string[] } {
  if (!finalAnswer || typeof finalAnswer !== 'string') {
    return { diagnosis: 'Unknown', reasoningTrace: [] };
  }

  const codeBlockMatch = /```json\s*([\s\S]*?)\s*```/i.exec(finalAnswer);
  const jsonCandidate = codeBlockMatch?.[1] ?? finalAnswer;

  try {
    const parsed = JSON.parse(jsonCandidate);
    const diagnosis =
      typeof parsed?.answer_choice === 'string' && parsed.answer_choice.trim()
        ? parsed.answer_choice.trim()
        : 'Unknown';

    const thinking =
      typeof parsed?.step_by_step_thinking === 'string' && parsed.step_by_step_thinking.trim()
        ? [parsed.step_by_step_thinking.trim()]
        : [];

    return { diagnosis, reasoningTrace: thinking };
  } catch {
    return {
      diagnosis: 'Unknown',
      reasoningTrace: [finalAnswer],
    };
  }
}

function mapDebateValidateToDebateResponse(data: DebateValidateResponse): DebateResponse {
  const debateResults = data?.debate_result?.debate_results ?? [];
  const debateLogs = debateResults.map((item) => {
    const finalConfidence =
      normalizeNumber(item?.judgment?.llm_judgment?.confidence) ||
      normalizeNumber(item?.debate?.proponent_confidence);

    return {
      path_id: item.path_index,
      history: (item?.debate?.rounds ?? []).map((round) => ({
        proponent: round?.proponent ?? '',
        opponent: round?.opponent ?? '',
      })),
      final_confidence: finalConfidence,
    };
  });

  const maxConfidence =
    debateLogs.length > 0 ? Math.max(...debateLogs.map((log) => normalizeNumber(log.final_confidence))) : 0;

  const parsedFinalAnswer = parseFinalAnswer(data?.final_answer ?? '');

  return {
    debate_logs: debateLogs,
    diagnosis: parsedFinalAnswer.diagnosis,
    confidence: maxConfidence,
    reasoning_trace: parsedFinalAnswer.reasoningTrace,
    mode: 'deepmed',
    step_time: 0,
  };
}

/**
 * Fetch with Timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out (${timeout / 1000}s). Please try again.`);
    }
    throw error;
  }
}

/**
 * Handle API Error Response
 */
async function handleErrorResponse(response: Response): Promise<never> {
  let errorMessage = `HTTP ${response.status} ${response.statusText}`;

  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      errorMessage = error.detail || error.message || error.error || errorMessage;
    } else {
      const text = await response.text();
      if (text) {
        errorMessage = text.substring(0, 200);
      }
    }
  } catch (e) {
    // Fallback to default message
  }

  throw new Error(errorMessage);
}

/**
 * Call CDP Retrieval API
 */
export async function fetchCDPRetrieval(
  caseReport: string,
  options: CDPApiOptions = {}
): Promise<RetrievalResponse> {
  if (!caseReport || caseReport.trim().length < 5) {
    throw new Error('Case report cannot be empty and must be at least 5 characters long.');
  }

  const topK = options.topK || 5;
  const requestBody: RetrieveContextRequest = {
    query: caseReport.trim(),
    top_k_pseudo: 16,
    top_k_hybrid: 16,
    use_graph_retrieval: true,
    top_k_graph: 1,
    top_k_reranked: topK,
    num_pseudo_questions: 0,
  };

  const timeout = options.timeout || 30000;
  const url = `${CDP_API_BASE}/retrieve/context`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
      timeout
    );

    if (!response.ok) {
      await handleErrorResponse(response);
    }

    const data = (await response.json()) as RetrieveContextResponse;

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format: Expected JSON object.');
    }

    if (!Array.isArray(data?.results?.reranked?.results)) {
      throw new Error('Invalid response format: results.reranked.results should be an array.');
    }

    return mapRetrieveContextToRetrievalResponse(data);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(`Cannot connect to CDP Service. Please check if ${CDP_API_BASE} is reachable.`);
      }
      throw error;
    }
    throw new Error('Unknown error occurred while calling CDP API.');
  }
}

/**
 * Call CDP Debate API
 */
export async function fetchCDPDebate(
  caseReport: string,
  options: CDPApiOptions = {}
): Promise<DebateResponse> {
  if (!caseReport || caseReport.trim().length < 5) {
    throw new Error('Case report cannot be empty and must be at least 5 characters long.');
  }

  const topK = options.topK || 5;
  const timeout = options.timeout || 30000;

  // 先调用检索接口，使用 reranked.results[].document 作为 paths（先跑通版）
  const retrieveRequestBody: RetrieveContextRequest = {
    query: caseReport.trim(),
    top_k_pseudo: 16,
    top_k_hybrid: 16,
    use_graph_retrieval: true,
    top_k_graph: 1,
    top_k_reranked: topK,
    num_pseudo_questions: 0,
  };

  try {
    const retrieveUrl = `${CDP_API_BASE}/retrieve/context`;
    const retrieveResponse = await fetchWithTimeout(
      retrieveUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(retrieveRequestBody),
      },
      timeout
    );

    if (!retrieveResponse.ok) {
      await handleErrorResponse(retrieveResponse);
    }

    const retrieveData = (await retrieveResponse.json()) as RetrieveContextResponse;
    const rawPaths = (retrieveData?.results?.reranked?.results ?? [])
      .map((item) => item?.document?.trim())
      .filter((item): item is string => Boolean(item));
    const dedupedPaths = Array.from(new Set(rawPaths));
    const paths = dedupedPaths.length > 0 ? dedupedPaths : [caseReport.trim()];

    const requestBody: DebateValidateRequest = {
      query: caseReport.trim(),
      paths,
      judgment_mode: 'llm',
    };

    const url = `${CDP_API_BASE}/debate/validate`;

    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
      timeout
    );

    if (!response.ok) {
      await handleErrorResponse(response);
    }

    const data = (await response.json()) as DebateValidateResponse;

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format: Expected JSON object.');
    }

    if (!Array.isArray(data?.debate_result?.debate_results)) {
      throw new Error('Invalid response format: debate_result.debate_results should be an array.');
    }

    return mapDebateValidateToDebateResponse(data);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(`Cannot connect to CDP Service. Please check if ${CDP_API_BASE} is reachable.`);
      }
      throw error;
    }
    throw new Error('Unknown error occurred while calling CDP API.');
  }
}
