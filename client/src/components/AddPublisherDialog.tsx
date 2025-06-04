// src/components/AddPublisherDialog.tsx
import React, { useEffect, useState } from 'react';
import BaseDialog from './BaseDialog.tsx';
import httpClient from '../utils/httpsClient.tsx';

export interface Publisher {
  id: number;
  name: string;
}

interface AddPublisherDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (p: Publisher) => void;
}

interface RawPublisher {
  id: number;
  name?: string;
}

const normalize = (raw: RawPublisher): Publisher => ({
  id: raw.id ?? 0,
  name: (raw.name ?? '').trim() || `Издатель #${raw.id}`,
});

const AddPublisherDialog: React.FC<AddPublisherDialogProps> = ({
  open,
  onClose,
  onPick,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Publisher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* поиск */
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
        const { data } = await httpClient.get<RawPublisher[]>('/publishers', {
          params: { q: query.trim() },
          signal: ctrl.signal,
        });
        setResults((Array.isArray(data) ? data : []).map(normalize));
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          console.error('Ошибка при поиске издателя:', err);
          setError('Не удалось загрузить издателей. Попробуйте ещё раз.');
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
      onOpenChange={(v) => !v && onClose()}
      title="Выбрать издателя"
      widthClass="max-w-lg"
    >
      <div className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск издателя (мин. 2 символа)…"
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
              <p className="text-sm text-gray-500">Издатели не найдены</p>
            )}

          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onPick(p);
                onClose();
              }}
              className="block w-full text-left rounded hover:bg-gray-100 px-2 py-1"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </BaseDialog>
  );
};

export default AddPublisherDialog;