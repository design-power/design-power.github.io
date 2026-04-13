const YANDEX_FORMS_BASE_URL = 'https://api.forms.yandex.net/v1';
const SUBMIT_PATH_RE = /^\/surveys\/([a-z0-9]+)\/form\/?$/i;
const ANSWERS_PATH_RE = /^\/surveys\/([a-z0-9]+)\/answers\/?$/i;
const DEFAULT_DEDUP_TTL_SECONDS = 60 * 60 * 24 * 365;

type KVStore = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

type Env = {
  ALLOWED_ORIGINS?: string;
  YANDEX_FORMS_OAUTH_TOKEN?: string;
  YANDEX_FORMS_ORG_ID?: string;
  SUBMIT_DEDUP_ENABLED?: string;
  SUBMIT_DEDUP_FIELD_NAME?: string;
  SUBMIT_DEDUP_TTL_SECONDS?: string;
  SUBMIT_DEDUP_KV?: KVStore;
};

const getAllowedOrigin = (request: Request, env: Env) => {
  const requestOrigin = request.headers.get('origin') ?? '';
  const allowedOriginsRaw = (env.ALLOWED_ORIGINS ?? '').trim();

  if (!allowedOriginsRaw) {
    return requestOrigin || '*';
  }

  const allowedOrigins = allowedOriginsRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (allowedOrigins.includes('*')) {
    return requestOrigin || '*';
  }

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return '';
};

const getCorsHeaders = (origin: string) => {
  const headers = new Headers();

  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Org-Id, X-Cloud-Org-Id');
  headers.set('Access-Control-Max-Age', '86400');

  return headers;
};

const jsonResponse = (payload: Record<string, string>, status: number, corsHeaders: Headers) => {
  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
};

const toUpstreamResponse = async (upstreamResponse: Response, corsHeaders: Headers) => {
  const body = await upstreamResponse.text();
  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', upstreamResponse.headers.get('Content-Type') ?? 'application/json');

  return new Response(body, {
    status: upstreamResponse.status,
    headers,
  });
};

const isTruthy = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const isDedupEnabled = (env: Env) => {
  const rawFlag = env.SUBMIT_DEDUP_ENABLED;

  if (typeof rawFlag !== 'string' || rawFlag.trim() === '') {
    return true;
  }

  return isTruthy(rawFlag);
};

const getDedupFieldName = (env: Env) => {
  const fieldName = (env.SUBMIT_DEDUP_FIELD_NAME ?? 'name').trim();
  return fieldName || 'name';
};

const getDedupTtlSeconds = (env: Env) => {
  const rawTtl = (env.SUBMIT_DEDUP_TTL_SECONDS ?? '').trim();

  if (!rawTtl) {
    return DEFAULT_DEDUP_TTL_SECONDS;
  }

  const parsed = Number.parseInt(rawTtl, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DEDUP_TTL_SECONDS;
  }

  return parsed;
};

const normalizeIdentityPart = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map((item) => stableStringify(item)).join(',') + ']';
  }

  const objectValue = value as Record<string, unknown>;
  const entries = Object.entries(objectValue).sort(([left], [right]) => left.localeCompare(right));

  return (
    '{' +
    entries
      .map(([key, entryValue]) => JSON.stringify(key) + ':' + stableStringify(entryValue))
      .join(',') +
    '}'
  );
};

const getSubmissionIdentity = (payload: Record<string, unknown>, dedupFieldName: string) => {
  const directValue = payload[dedupFieldName];

  if (
    typeof directValue === 'string' ||
    typeof directValue === 'number' ||
    typeof directValue === 'boolean'
  ) {
    const normalized = normalizeIdentityPart(String(directValue));

    if (normalized) {
      return dedupFieldName + ':' + normalized;
    }
  }

  const fallbackPayload = normalizeIdentityPart(stableStringify(payload));
  return 'payload:' + fallbackPayload;
};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const parseSubmitPayload = (requestBodyText: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(requestBodyText) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

const createUpstreamHeaders = (request: Request, env: Env, includeContentType: boolean) => {
  const upstreamHeaders = new Headers();

  if (includeContentType) {
    upstreamHeaders.set('Content-Type', request.headers.get('Content-Type') ?? 'application/json');
  }

  const workerToken = (env.YANDEX_FORMS_OAUTH_TOKEN ?? '').trim();
  const requestToken = request.headers.get('Authorization') ?? '';
  const authHeader = workerToken ? `OAuth ${workerToken}` : requestToken;

  if (authHeader) {
    upstreamHeaders.set('Authorization', authHeader);
  }

  const envOrgId = (env.YANDEX_FORMS_ORG_ID ?? '').trim();
  const requestOrgId = (request.headers.get('X-Org-Id') ?? '').trim();
  const requestCloudOrgId = (request.headers.get('X-Cloud-Org-Id') ?? '').trim();

  if (envOrgId) {
    upstreamHeaders.set('X-Org-Id', envOrgId);
  } else if (requestOrgId) {
    upstreamHeaders.set('X-Org-Id', requestOrgId);
  }

  if (requestCloudOrgId) {
    upstreamHeaders.set('X-Cloud-Org-Id', requestCloudOrgId);
  }

  return upstreamHeaders;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const allowedOrigin = getAllowedOrigin(request, env);
    const corsHeaders = getCorsHeaders(allowedOrigin);

    if (request.method === 'OPTIONS') {
      if (!allowedOrigin) {
        return jsonResponse({ error: 'Origin is not allowed' }, 403, corsHeaders);
      }

      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (!allowedOrigin) {
      return jsonResponse({ error: 'Origin is not allowed' }, 403, corsHeaders);
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse({ status: 'ok' }, 200, corsHeaders);
    }

    const submitPathMatch = url.pathname.match(SUBMIT_PATH_RE);
    const answersPathMatch = url.pathname.match(ANSWERS_PATH_RE);

    if (request.method === 'GET' && answersPathMatch) {
      const upstreamHeaders = createUpstreamHeaders(request, env, false);
      const upstreamResponse = await fetch(YANDEX_FORMS_BASE_URL + url.pathname + url.search, {
        method: 'GET',
        headers: upstreamHeaders,
      });

      return toUpstreamResponse(upstreamResponse, corsHeaders);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    if (!submitPathMatch) {
      return jsonResponse({ error: 'Unsupported path' }, 404, corsHeaders);
    }

    const surveyId = submitPathMatch[1].toLowerCase();
    const requestBodyText = await request.text();
    const upstreamHeaders = createUpstreamHeaders(request, env, true);

    const dedupStore = env.SUBMIT_DEDUP_KV;
    let dedupKey: string | null = null;

    if (dedupStore && isDedupEnabled(env)) {
      const payload = parseSubmitPayload(requestBodyText);

      if (!payload) {
        return jsonResponse({ error: 'Invalid JSON payload' }, 400, corsHeaders);
      }

      const dedupFieldName = getDedupFieldName(env);
      const identity = getSubmissionIdentity(payload, dedupFieldName);
      const identityHash = await sha256Hex(surveyId + '|' + identity);
      dedupKey = `submission:${surveyId}:${identityHash}`;

      const duplicate = await dedupStore.get(dedupKey);

      if (duplicate) {
        return jsonResponse(
          {
            error: 'Duplicate submission',
            code: 'duplicate_submission',
            message: 'Response already exists for this person',
          },
          409,
          corsHeaders,
        );
      }
    }

    const upstreamResponse = await fetch(YANDEX_FORMS_BASE_URL + url.pathname + url.search, {
      method: 'POST',
      headers: upstreamHeaders,
      body: requestBodyText,
    });

    if (upstreamResponse.ok && dedupStore && dedupKey) {
      await dedupStore.put(
        dedupKey,
        JSON.stringify({
          surveyId,
          createdAt: new Date().toISOString(),
        }),
        {
          expirationTtl: getDedupTtlSeconds(env),
        },
      );
    }

    return toUpstreamResponse(upstreamResponse, corsHeaders);
  },
};
