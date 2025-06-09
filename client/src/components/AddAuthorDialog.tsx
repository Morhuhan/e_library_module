import React, { useEffect, useState } from 'react';
import BaseDialog from './BaseDialog.tsx';
import httpClient from '../utils/httpsClient.tsx';

// Интерфейс Author (взято из вашего сообщения)
export interface Author {
  id: number;
  firstName: string;
  patronymic: string | null;
  lastName: string;
  birthYear: number | null;
}

// Интерфейс для пропсов компонента
interface AddAuthorDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (author: Author) => void;
}

// Тип для ответа от бэкенда (ожидаемая структура сырых данных)
interface RawAuthor {
  id: number;
  firstName?: string;
  patronymic?: string | null;
  lastName?: string;
  birthYear?: number | null;
}

/* Функция нормализации автора */
const normalizeAuthor = (raw: RawAuthor): Author => {
  // Если нет имени, используем заглушку
  if (!raw.firstName && !raw.lastName) {
    return {
      id: raw.id || 0,
      firstName: '',
      patronymic: null,
      lastName: `Автор #${raw.id || 'неизвестен'}`,
      birthYear: raw.birthYear || null,
    };
  }

  // Если lastName пустое, используем firstName как основное имя
  const lastName = raw.lastName?.trim() || raw.firstName?.trim() || '';
  const firstName = raw.lastName?.trim() ? raw.firstName?.trim() || '' : '';

  return {
    id: raw.id,
    firstName,
    patronymic: raw.patronymic?.trim() || null,
    lastName,
    birthYear: raw.birthYear || null,
  };
};

/* Компонент */
const AddAuthorDialog: React.FC<AddAuthorDialogProps> = ({ open, onClose, onPick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Поиск авторов */
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
        const { data } = await httpClient.get<RawAuthor[]>('/authors', {
          params: { q: query.trim() },
          signal: ctrl.signal,
        });

        // Проверяем, что данные — массив
        const rawArr = Array.isArray(data) ? data : [];
        setResults(rawArr.map(normalizeAuthor));
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          console.error('Ошибка при поиске авторов:', err);
          setError('Не удалось загрузить авторов. Попробуйте ещё раз.');
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

  /* Рендеринг */
  return (
    <BaseDialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Добавить автора"
      widthClass="max-w-lg"
    >
      <div className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск автора (введите минимум 2 символа)…"
          className="w-full rounded border px-2 py-1 text-sm"
          autoFocus
        />

        <div className="max-h-60 overflow-y-auto space-y-1">
          {isLoading && <p className="text-sm text-gray-500">Загрузка…</p>}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {!isLoading && !error && results.length === 0 && query.trim().length >= 2 && (
            <p className="text-sm text-gray-500">Авторы не найдены</p>
          )}

          {results.map((author) => (
            <button
              key={author.id}
              type="button"
              onClick={() => {
                onPick(author);
                onClose();
              }}
              className="block w-full text-left rounded hover:bg-gray-100 px-2 py-1"
            >
              {/* Отображаем имя автора: используем lastName как основное, добавляем firstName и patronymic, если они есть */}
              {author.lastName}
              {author.firstName && ` ${author.firstName}`}
              {author.patronymic && ` ${author.patronymic}`}
              {author.birthYear && ` (${author.birthYear})`}
            </button>
          ))}
        </div>
      </div>
    </BaseDialog>
  );
};

export default AddAuthorDialog;