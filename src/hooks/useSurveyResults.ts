import { useCallback, useEffect, useState } from 'react';

const YANDEX_FORMS_SURVEY_ID = import.meta.env.VITE_YANDEX_FORMS_SURVEY_ID ?? '';
const YANDEX_FORMS_NAME_SLUG = import.meta.env.VITE_YANDEX_FORMS_NAME_SLUG ?? 'name';
const YANDEX_FORMS_CONFIRMATION_SLUG = import.meta.env.VITE_YANDEX_FORMS_CONFIRMATION_SLUG ?? 'confirmation';
const YANDEX_FORMS_PROXY_URL =
  (import.meta.env.VITE_YANDEX_FORMS_PROXY_URL ?? '').trim() ||
  (import.meta.env.DEV ? '/api/yandex-forms' : '');
const YANDEX_FORMS_OAUTH_TOKEN = import.meta.env.VITE_YANDEX_FORMS_OAUTH_TOKEN ?? '';
const YANDEX_FORMS_ORG_ID = (import.meta.env.VITE_YANDEX_FORMS_ORG_ID ?? '').trim();
const YANDEX_FORMS_CLOUD_ORG_ID = (import.meta.env.VITE_YANDEX_FORMS_CLOUD_ORG_ID ?? '').trim();
const ANSWERS_PAGE_SIZE = 100;
const MAX_PAGES = 30;

export type SurveyResultRow = {
  id: string;
  name: string;
  decision: string;
  createdAt: string;
};

export type SurveyResultsStatus = 'idle' | 'loading' | 'success' | 'error';

type ApiAnswerItem = {
  id?: string;
  value?: unknown;
  label?: unknown;
};

type ApiAnswer = {
  id?: string | number;
  created?: string;
  data?: ApiAnswerItem[];
};

type ApiColumn = {
  id?: string;
};

type ApiAnswersResponse = {
  answers?: ApiAnswer[];
  columns?: ApiColumn[];
  next?: {
    next_url?: string;
  };
};

const getFormsApiBaseUrl = () => YANDEX_FORMS_PROXY_URL.replace(/\/$/, '');

const getNextPageUrl = (apiBaseUrl: string, nextUrl: string) => {
  if (!nextUrl) {
    return '';
  }

  if (nextUrl.startsWith('http://') || nextUrl.startsWith('https://')) {
    return nextUrl;
  }

  const normalizedPath = nextUrl.startsWith('/v1/') ? nextUrl.replace(/^\/v1/, '') : nextUrl;

  if (normalizedPath.startsWith('/')) {
    return apiBaseUrl + normalizedPath;
  }

  return apiBaseUrl + '/' + normalizedPath;
};

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');

const valueToParts = (value: unknown): string[] => {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => valueToParts(entry));
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;

    if (typeof objectValue.label === 'string') {
      return [objectValue.label];
    }

    if (objectValue.value !== undefined) {
      return valueToParts(objectValue.value);
    }
  }

  return [];
};

const valueToText = (value: unknown) =>
  valueToParts(value)
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join(', ');

const normalizeDecision = (value: unknown) => {
  const normalizedValues = valueToParts(value)
    .map((entry) => normalizeText(entry).toLowerCase())
    .filter(Boolean);

  if (
    normalizedValues.some(
      (entry) =>
        entry === 'yes' ||
        entry === 'true' ||
        entry === 'да' ||
        entry === 'приду' ||
        entry === 'подтверждаю',
    )
  ) {
    return 'Приду';
  }

  if (
    normalizedValues.some(
      (entry) =>
        entry === 'no' || entry === 'false' || entry === 'нет' || entry === 'не приду' || entry === 'не приду.',
    )
  ) {
    return 'Не приду';
  }

  const fallback = valueToText(value);
  return fallback || 'Не указано';
};

const getAnswerValue = (answer: ApiAnswer, columns: ApiColumn[], slug: string): unknown => {
  const answerData = Array.isArray(answer.data) ? answer.data : [];

  const directValue = answerData.find((item) => item.id === slug)?.value;

  if (directValue !== undefined) {
    return directValue;
  }

  const columnIndex = columns.findIndex((column) => column.id === slug);

  if (columnIndex >= 0 && answerData[columnIndex]) {
    return answerData[columnIndex].value;
  }

  return undefined;
};

const toTableRows = (answers: ApiAnswer[], columns: ApiColumn[]): SurveyResultRow[] => {
  return answers
    .map((answer, index) => {
      const nameValue = getAnswerValue(answer, columns, YANDEX_FORMS_NAME_SLUG);
      const confirmationValue = getAnswerValue(answer, columns, YANDEX_FORMS_CONFIRMATION_SLUG);
      const name = valueToText(nameValue) || 'Не указано';
      const decision = normalizeDecision(confirmationValue);

      return {
        id: String(answer.id ?? index),
        name,
        decision,
        createdAt: typeof answer.created === 'string' ? answer.created : '',
      };
    })
    .sort((left, right) => {
      const leftDate = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightDate = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightDate - leftDate;
    });
};

export function useSurveyResults() {
  const [rows, setRows] = useState<SurveyResultRow[]>([]);
  const [status, setStatus] = useState<SurveyResultsStatus>('idle');
  const [message, setMessage] = useState('');

  const loadResults = useCallback(async () => {
    if (!YANDEX_FORMS_SURVEY_ID) {
      setStatus('error');
      setMessage('Не настроен VITE_YANDEX_FORMS_SURVEY_ID.');
      return;
    }

    if (!YANDEX_FORMS_PROXY_URL) {
      setStatus('error');
      setMessage('Не настроен VITE_YANDEX_FORMS_PROXY_URL.');
      return;
    }

    setStatus('loading');
    setMessage('');

    const apiBaseUrl = getFormsApiBaseUrl();
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (YANDEX_FORMS_OAUTH_TOKEN) {
      headers.Authorization = 'OAuth ' + YANDEX_FORMS_OAUTH_TOKEN;
    }

    if (YANDEX_FORMS_ORG_ID) {
      headers['X-Org-Id'] = YANDEX_FORMS_ORG_ID;
    }

    if (YANDEX_FORMS_CLOUD_ORG_ID) {
      headers['X-Cloud-Org-Id'] = YANDEX_FORMS_CLOUD_ORG_ID;
    }

    let pageUrl =
      apiBaseUrl +
      '/surveys/' +
      YANDEX_FORMS_SURVEY_ID +
      '/answers?page_size=' +
      String(ANSWERS_PAGE_SIZE);

    const allAnswers: ApiAnswer[] = [];
    let columns: ApiColumn[] = [];

    try {
      for (let pageIndex = 0; pageIndex < MAX_PAGES && pageUrl; pageIndex += 1) {
        const response = await fetch(pageUrl, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const responseText = await response.text();

          if (response.status === 400 && responseText.includes('Требуется организация')) {
            throw new Error(
              'Для чтения ответов нужен X-Org-Id. Добавьте VITE_YANDEX_FORMS_ORG_ID или настройте YANDEX_FORMS_ORG_ID в Worker.',
            );
          }

          throw new Error(responseText || 'HTTP ' + response.status);
        }

        const payload = (await response.json()) as ApiAnswersResponse;

        if (Array.isArray(payload.columns) && payload.columns.length > 0) {
          columns = payload.columns;
        }

        if (Array.isArray(payload.answers) && payload.answers.length > 0) {
          allAnswers.push(...payload.answers);
        }

        const nextUrl = payload.next?.next_url ?? '';
        pageUrl = nextUrl ? getNextPageUrl(apiBaseUrl, nextUrl) : '';
      }

      setRows(toTableRows(allAnswers, columns));
      setStatus('success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить ответы.';
      setStatus('error');
      setMessage(errorMessage);
    }
  }, []);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  return {
    rows,
    status,
    message,
    reload: loadResults,
  };
}
