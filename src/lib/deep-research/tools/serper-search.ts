import axios from 'axios';
import {SerperSearchResponse, SERPQuery} from '../types';

// Note: Serper is currently not in use. This code is kept for potential future use.
// TODO: Add getSerperApiKey() to user-context.ts if needed
const SERPER_API_KEY = process.env.SERPER_API_KEY || '';

export async function serperSearch(query: SERPQuery): Promise<{ response: SerperSearchResponse }> {
  if (!SERPER_API_KEY) {
    throw new Error('SERPER_API_KEY is not configured. Please add it to environment variables or user context.');
  }
  
  const response = await axios.post<SerperSearchResponse>('https://google.serper.dev/search', {
    ...query,
    autocorrect: false,
  }, {
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  if (response.status !== 200) {
    throw new Error(`Serper search failed: ${response.status} ${response.statusText}`)
  }

  // Maintain the same return structure as the original code
  return {response: response.data};
}


export async function serperSearchOld(query: string): Promise<{ response: SerperSearchResponse }> {
  const response = await axios.post<SerperSearchResponse>('https://google.serper.dev/search', {
    q: query,
    autocorrect: false,
  }, {
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  if (response.status !== 200) {
    throw new Error(`Serper search failed: ${response.status} ${response.statusText}`)
  }

  // Maintain the same return structure as the original code
  return {response: response.data};
}
