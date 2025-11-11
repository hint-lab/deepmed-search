import axios from 'axios';
import { TokenTracker } from "../utils/token-tracker";
import { ReadResponse, TrackerContext } from '../types';
import { getJinaApiKey } from "../user-context";

export async function readUrl(
  url: string,
  withAllLinks?: boolean,
  trackers?: TrackerContext
): Promise<{ response: ReadResponse }> {
  const tracker = trackers?.tokenTracker;
  const taskId = trackers?.taskId || 'unknown';
  if (!url.trim()) {
    throw new Error('URL cannot be empty');
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('Invalid URL, only http and https URLs are supported');
  }

  const jinaApiKey = getJinaApiKey(); // 从用户上下文获取
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${jinaApiKey}`,
    'Content-Type': 'application/json',
    'X-Retain-Images': 'none',
    'X-Md-Link-Style': 'discarded',
  };

  if (withAllLinks) {
    headers['X-With-Links-Summary'] = 'all';
  }

  try {
    // Use axios which handles encoding properly
    const { data } = await axios.post<ReadResponse>(
      'https://r.jina.ai/',
      { url },
      {
        headers,
        timeout: 60000,
        responseType: 'json'
      }
    );

    if (!data.data) {
      throw new Error('Invalid response data');
    }

    const readInfo = {
      title: data.data.title,
      url: data.data.url,
      tokens: data.data.usage?.tokens || 0
    };
    console.log('Read:', readInfo);

    // Publish read content to frontend
    if (trackers) {
      const { publishReadContent } = await import('../tracker-store');
      await publishReadContent(taskId, readInfo);
    }

    const tokens = data.data.usage?.tokens || 0;
    const tokenTracker = tracker || new TokenTracker(taskId);
    tokenTracker.trackUsage('read', {
      totalTokens: tokens,
      promptTokens: url.length,
      completionTokens: tokens
    });

    return { response: data };
  } catch (error) {
    // Handle axios errors with better type safety
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const status = error.response.status;
        const errorData = error.response.data as any;

        if (status === 402) {
          throw new Error(errorData?.readableMessage || 'Insufficient balance');
        }

        // 对于常见的临时错误，提供更友好的错误信息
        if (status === 503) {
          throw new Error(`网站暂时不可用 (HTTP 503)，请稍后重试`);
        } else if (status === 429) {
          throw new Error(`请求过于频繁 (HTTP 429)，请降低访问速度`);
        } else if (status === 403) {
          throw new Error(`访问被拒绝 (HTTP 403)，网站可能有反爬虫保护`);
        }

        throw new Error(errorData?.readableMessage || `HTTP Error ${status}`);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response received from server');
      } else {
        // Something happened in setting up the request
        throw new Error(`Request failed: ${error.message}`);
      }
    }
    // For non-axios errors
    throw error;
  }
}