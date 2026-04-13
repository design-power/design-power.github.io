import { useSurveyResults } from '../hooks/useSurveyResults';
import './results.css';

export function ResultsPage() {
  const { rows, status, message, reload } = useSurveyResults();

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
      )}
    </section>
  );
}
