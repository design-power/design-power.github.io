import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';

const YANDEX_FORMS_ENDPOINT = 'https://api.forms.yandex.net/v1/surveys';
const YANDEX_FORMS_SURVEY_ID = import.meta.env.VITE_YANDEX_FORMS_SURVEY_ID ?? '';
const YANDEX_FORMS_NAME_SLUG = import.meta.env.VITE_YANDEX_FORMS_NAME_SLUG ?? 'name';
const YANDEX_FORMS_CONFIRMATION_SLUG = import.meta.env.VITE_YANDEX_FORMS_CONFIRMATION_SLUG ?? 'confirmation';
const YANDEX_FORMS_CONFIRMATION_YES_VALUE =
  import.meta.env.VITE_YANDEX_FORMS_CONFIRMATION_YES_VALUE ?? 'yes';
const YANDEX_FORMS_CONFIRMATION_NO_VALUE =
  import.meta.env.VITE_YANDEX_FORMS_CONFIRMATION_NO_VALUE ?? 'no';
const YANDEX_FORMS_OAUTH_TOKEN = import.meta.env.VITE_YANDEX_FORMS_OAUTH_TOKEN ?? '';

export type FormSubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export function useProtocolWitnessForm() {
  const [formSubmitStatus, setFormSubmitStatus] = useState<FormSubmitStatus>('idle');
  const [formSubmitMessage, setFormSubmitMessage] = useState('');

  const handleSubmitWitnessForm = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!YANDEX_FORMS_SURVEY_ID) {
      setFormSubmitStatus('error');
      setFormSubmitMessage(
        'Не настроен VITE_YANDEX_FORMS_SURVEY_ID. Добавьте его в .env и перезапустите dev сервер.',
      );
      return;
    }

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get('name') ?? '').trim();
    const confirmationRaw = String(formData.get('confirmation') ?? '').trim();

    if (!fullName || !confirmationRaw) {
      setFormSubmitStatus('error');
      setFormSubmitMessage('Заполните ФИО и выберите один из вариантов.');
      return;
    }

    setFormSubmitStatus('submitting');
    setFormSubmitMessage('');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (YANDEX_FORMS_OAUTH_TOKEN) {
      headers.Authorization = 'OAuth ' + YANDEX_FORMS_OAUTH_TOKEN;
    }

    const confirmationValue =
      confirmationRaw === 'yes'
        ? YANDEX_FORMS_CONFIRMATION_YES_VALUE
        : YANDEX_FORMS_CONFIRMATION_NO_VALUE;

    try {
      const response = await fetch(YANDEX_FORMS_ENDPOINT + '/' + YANDEX_FORMS_SURVEY_ID + '/form', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          questions: [
            {
              slug: YANDEX_FORMS_NAME_SLUG,
              value: fullName,
            },
            {
              slug: YANDEX_FORMS_CONFIRMATION_SLUG,
              value: confirmationValue,
            },
          ],
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(responseText || 'HTTP ' + response.status);
      }

      event.currentTarget.reset();
      setFormSubmitStatus('success');
      setFormSubmitMessage('Спасибо! Ответ отправлен.');
    } catch (error) {
      console.error('Yandex Forms submit failed:', error);
      setFormSubmitStatus('error');
      setFormSubmitMessage('Не удалось отправить форму. Проверьте настройки Yandex Forms и сеть.');
    }
  }, []);

  return {
    formSubmitStatus,
    formSubmitMessage,
    handleSubmitWitnessForm,
  };
}
