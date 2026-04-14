import { useMemo } from 'react';
import { useSurveyResults } from '../hooks/useSurveyResults';
import './results.css';

export function ResultsPage() {
  const { rows, status, message, reload } = useSurveyResults();

  const stats = useMemo(() => {
    let confirmed = 0;
    let declined = 0;
    let unsure = 0;
    let other = 0;

    for (const row of rows) {
      if (row.decision === 'Приду') {
        confirmed += 1;
        continue;
      }

      if (row.decision === 'Не приду') {
        declined += 1;
        continue;
      }

      if (row.decision === 'Затрудняюсь ответить') {
        unsure += 1;
        continue;
      }

      other += 1;
    }

    return {
      total: rows.length,
      confirmed,
      declined,
      unsure,
      other,
    };
  }, [rows]);

  return (
    <section className="invitation-screen results-screen">
      <header className="results-header">
        <h1 className="results-title">РЕЗУЛЬТАТЫ ОТВЕТОВ</h1>
        <p className="results-subtitle">Имя и решение по приглашению</p>
      </header>

      <div className="results-actions">
        <button
          type="button"
          className="results-action"
          onClick={() => {
            void reload();
          }}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Обновление...' : 'Обновить'}
        </button>
      </div>

      {status === 'error' && <p className="results-status results-status--error">{message}</p>}
      {status === 'loading' && <p className="results-status">Загружаем ответы...</p>}
      {status === 'success' && rows.length === 0 && (
        <p className="results-status">Пока нет отправленных ответов.</p>
      )}

      {rows.length > 0 && (
        <>
          <section className="results-summary" aria-label="Сводка ответов">
            <p className="results-summary-total">
              Всего проголосовало: <strong>{stats.total}</strong>
            </p>
            <div className="results-summary-grid">
              <p className="results-summary-item">
                <span>Приду</span>
                <strong>{stats.confirmed}</strong>
              </p>
              <p className="results-summary-item">
                <span>Не приду</span>
                <strong>{stats.declined}</strong>
              </p>
              <p className="results-summary-item">
                <span>Затрудняюсь</span>
                <strong>{stats.unsure}</strong>
              </p>
              {stats.other > 0 && (
                <p className="results-summary-item">
                  <span>Другое</span>
                  <strong>{stats.other}</strong>
                </p>
              )}
            </div>
          </section>

          <div className="results-table-shell">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Решение</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.decision}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
