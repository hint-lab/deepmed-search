'use client';

import { Authorization } from '@/constants/authorization';
import { ResponseType } from '@/interfaces/database/base';
import i18n from '@/locales/config';
import authorizationUtil, {
  getAuthorization,
  redirectToLogin,
} from '@/utils/authorization-util';
import { toast } from "sonner"
import { convertTheKeysOfTheObjectToSnake } from './common-util';

const FAILED_TO_FETCH = 'Failed to fetch';

const RetcodeMessage = {
  200: i18n.t('message.200'),
  201: i18n.t('message.201'),
  202: i18n.t('message.202'),
  204: i18n.t('message.204'),
  400: i18n.t('message.400'),
  401: i18n.t('message.401'),
  403: i18n.t('message.403'),
  404: i18n.t('message.404'),
  406: i18n.t('message.406'),
  410: i18n.t('message.410'),
  413: i18n.t('message.413'),
  422: i18n.t('message.422'),
  500: i18n.t('message.500'),
  502: i18n.t('message.502'),
  503: i18n.t('message.503'),
  504: i18n.t('message.504'),
};
type ResultCode =
  | 200
  | 201
  | 202
  | 204
  | 400
  | 401
  | 403
  | 404
  | 406
  | 410
  | 413
  | 422
  | 500
  | 502
  | 503
  | 504;

interface RequestOptions extends RequestInit {
  skipToken?: boolean;
  params?: Record<string, any>;
  responseType?: 'json' | 'blob' | 'text';
  timeout?: number;
}

const handleError = (error: { status?: number; url?: string; message: string }) => {
  if (error.message === FAILED_TO_FETCH) {
    toast.error(i18n.t('message.networkAnomaly'), {
      description: i18n.t('message.networkAnomalyDescription'),
      duration: 3000,
    });
  } else if (error.status) {
    const errorText = RetcodeMessage[error.status as ResultCode] || error.message;
    toast.error(`${i18n.t('message.requestError')} ${error.status}: ${error.url}`, {
      description: errorText,
      duration: 3000,
    });
  }
};

const timeoutPromise = (timeout: number) => {
  return new Promise<Response>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout of ${timeout}ms exceeded`));
    }, timeout);
  });
};

async function fetchWithTimeout(url: string, options?: RequestOptions): Promise<Response> {
  const { timeout = 300000, ...fetchOptions } = options || {};

  try {
    const response = await Promise.race([
      fetch(url, fetchOptions),
      timeoutPromise(timeout)
    ]);
    return response;
  } catch (error: any) {
    handleError(error);
    throw error;
  }
}

function handleRequestInterceptor(url: string, options?: RequestOptions) {
  const opts = { ...options };

  if (opts.body && typeof opts.body === 'object') {
    opts.body = JSON.stringify(convertTheKeysOfTheObjectToSnake(opts.body));
  }

  if (opts.params) {
    const params = convertTheKeysOfTheObjectToSnake(opts.params);
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  opts.headers = {
    'Content-Type': 'application/json',
    ...(opts.skipToken ? {} : { [Authorization]: getAuthorization() }),
    ...opts.headers,
  };

  return { url, options: opts };
}

async function handleResponseInterceptor(response: Response, options?: RequestOptions) {
  if (!response.ok) {
    handleError({
      status: response.status,
      url: response.url,
      message: response.statusText
    });
  }

  if (response.status === 413 || response.status === 504) {
    toast.error(RetcodeMessage[response.status as ResultCode]);
  }

  if (options?.responseType === 'blob') {
    return response.blob();
  }

  try {
    const data: ResponseType = await response.clone().json();

    if (data?.code === 100) {
      toast.error(data?.message);
    } else if (data?.code === 401) {
      toast.error(data?.message, {
        description: data?.message,
        duration: 3000,
      });
      authorizationUtil.removeAll();
      redirectToLogin();
    } else if (data?.code !== 0) {
      toast.error(`${i18n.t('message.hint')} : ${data?.code}`, {
        description: data?.message,
        duration: 3000,
      });
    }

    return data;
  } catch (error) {
    return response.text();
  }
}

async function request<T = any>(url: string, options?: RequestOptions): Promise<T> {
  const { url: processedUrl, options: processedOptions } = handleRequestInterceptor(url, options);

  try {
    const response = await fetchWithTimeout(processedUrl, processedOptions);
    return await handleResponseInterceptor(response, options) as T;
  } catch (error: any) {
    handleError(error);
    throw error;
  }
}

export const get = <T = any>(url: string, options?: Omit<RequestOptions, 'method'>) => {
  return request<T>(url, { ...options, method: 'GET' });
};

export const post = <T = any>(url: string, body: any, options?: Omit<RequestOptions, 'method' | 'body'>) => {
  return request<T>(url, { ...options, method: 'POST', body });
};

export const put = <T = any>(url: string, body: any, options?: Omit<RequestOptions, 'method' | 'body'>) => {
  return request<T>(url, { ...options, method: 'PUT', body });
};

export const del = <T = any>(url: string, options?: Omit<RequestOptions, 'method'>) => {
  return request<T>(url, { ...options, method: 'DELETE' });
};

export default request;
