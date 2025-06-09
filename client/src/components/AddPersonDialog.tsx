// src/components/AddPersonDialog.tsx
import React, { useEffect, useState } from 'react';
import BaseDialog from './BaseDialog.tsx';
import httpClient from '../utils/httpsClient.tsx';
import { Person } from '../utils/interfaces.tsx';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (person: Person) => void;
}

type RawPerson = Partial<Person> & { id: number };

const normalizePerson = (raw: RawPerson): Person => ({
  id: raw.id,
  firstName: raw.firstName?.trim() ?? '',
  lastName: raw.lastName?.trim() || raw.firstName?.trim() || `Читатель #${raw.id}`,
  patronymic: raw.patronymic?.trim() ?? '',
  sex: raw.sex ?? '',
  birthDate: raw.birthDate ?? '',
});

const AddPersonDialog: React.FC<Props> = ({ open, onClose, onPick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setError(null);
      return;
    }

    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const ctrl = new AbortController();
    const tId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data } = await httpClient.get<RawPerson[]>('/persons', {
          params: { q: query.trim() },
          signal: ctrl.signal,
        });
        setResults((Array.isArray(data) ? data : []).map(normalizePerson));
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          console.error(err);
          setError('Не удалось загрузить читателей. Попробуйте ещё раз.');
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(tId);
      ctrl.abort();
    };
  }, [query, open]);

  return (
    <BaseDialog
      open={open}
      onOpenChange={v => !v && onClose()}
      title="Выбрать читателя"
      widthClass="max-w-lg"
    >
      <div className="space-y-3">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск читателя (минимум 2 символа)…"
          className="w-full rounded border px-2 py-1 text-sm"
          autoFocus
        />

        <div className="max-h-60 overflow-y-auto space-y-1">
          {isLoading && <p className="text-sm text-gray-500">Загрузка…</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!isLoading &&
            !error &&
            results.length === 0 &&
            query.trim().length >= 2 && (
              <p className="text-sm text-gray-500">Читатели не найдены</p>
            )}

          {results.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onPick(p);
                onClose();
              }}
              className="block w-full text-left rounded hover:bg-gray-100 px-2 py-1"
            >
              {p.lastName} {p.firstName}
              {p.patronymic && ` ${p.patronymic}`}
            </button>
          ))}
        </div>
      </div>
    </BaseDialog>
  );
};

export default AddPersonDialog;