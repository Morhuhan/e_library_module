import React, { useState, useEffect } from 'react';
import type { Book, Person } from '../utils/interfaces.tsx';
import httpClient from '../utils/httpsClient.tsx';
import { toast } from 'react-toastify';

type ActionType = 'borrow' | 'return';

const BorrowReturn: React.FC = () => {
  const [actionType, setActionType] = useState<ActionType>('borrow');
  const [bookLocalIndexQuery, setBookLocalIndexQuery] = useState('');
  const [foundBook, setFoundBook] = useState<Book | null>(null);
  const [selectedCopyId, setSelectedCopyId] = useState<number | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const res = await httpClient.get<Person[]>('/persons');
        setPersons(res.data);
      } catch (err) {
        console.error('Ошибка при получении людей:', err);
      }
    };
    fetchPersons();
  }, []);

  const resetAllStates = () => {
    setFoundBook(null);
    setSelectedCopyId(null);
    setBookLocalIndexQuery('');
    setSelectedPersonId(null);
  };

  const handleActionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionType(e.target.value as ActionType);
    resetAllStates();
  };

  const handleFindBook = async () => {
    if (!bookLocalIndexQuery.trim()) {
      alert('Введите локальный индекс');
      return;
    }
    try {
      const url = `/books/find?searchType=local_index&query=${encodeURIComponent(
        bookLocalIndexQuery
      )}`;
      const res = await httpClient.get<Book>(url);
      setFoundBook(res.data);
      setSelectedCopyId(null);
    } catch (err) {
      console.error('Ошибка при поиске книги:', err);
      setFoundBook(null);
    }
  };

  const refetchBook = async () => {
    if (!bookLocalIndexQuery) return;
    try {
      const url = `/books/find?searchType=local_index&query=${encodeURIComponent(
        bookLocalIndexQuery
      )}`;
      const res = await httpClient.get<Book>(url);
      setFoundBook(res.data);
    } catch (err) {
      console.error('Ошибка при обновлении книги:', err);
    }
  };

  const handleBorrow = async () => {
    if (!foundBook || !selectedCopyId || !selectedPersonId) {
      alert('Выберите книгу, экземпляр и человека');
      return;
    }
    try {
      await httpClient.post('/borrow-records', {
        bookCopyId: selectedCopyId,
        personId: selectedPersonId,
      });
      toast.success('Книга успешно выдана');
      await refetchBook();
      resetAllStates();
    } catch (err: any) {
      console.error('Ошибка при выдаче:', err);
    }
  };

  const handleReturn = async () => {
    if (!foundBook || !selectedCopyId) {
      alert('Сначала найдите книгу и выберите экземпляр');
      return;
    }
    const copy = foundBook.bookCopies?.find((c) => c.id === selectedCopyId);
    if (!copy?.borrowRecords) {
      alert('Нет записей о выдаче для этого экземпляра');
      return;
    }
    const activeRecord = copy.borrowRecords.find((r) => !r.returnDate);
    if (!activeRecord) {
      alert('Этот экземпляр не числится выданным');
      return;
    }
    try {
      await httpClient.patch(`/borrow-records/${activeRecord.id}/return`, {});
      toast.success('Книга возвращена');
      await refetchBook();
      setSelectedCopyId(null);
    } catch (err) {
      console.error('Ошибка при возврате:', err);
    }
  };

  const getFilteredCopies = () => {
    if (!foundBook?.bookCopies?.length) return [];
    return foundBook.bookCopies.filter((c) => {
      const isBorrowed = c.borrowRecords?.some((r) => !r.returnDate);
      return actionType === 'borrow' ? !isBorrowed : isBorrowed;
    });
  };

  const filteredCopies = getFilteredCopies();

  return (
    <div className="container mx-auto px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Выдача / Возврат</h2>
      <div className="flex flex-col gap-4 max-w-md">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Действие:</label>
          <select
            value={actionType}
            onChange={handleActionTypeChange}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
          >
            <option value="borrow">Выдать</option>
            <option value="return">Принять</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Локальный индекс:</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Введите индекс"
              value={bookLocalIndexQuery}
              onChange={(e) => setBookLocalIndexQuery(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
            />
            <button
              onClick={handleFindBook}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-1 px-3 rounded focus:outline-none"
            >
              Найти
            </button>
          </div>
        </div>
      </div>

      {foundBook && (
        <div className="mt-4 p-4 border border-gray-200 rounded bg-gray-50">
          <h4 className="font-semibold mb-2">Найдена книга:</h4>
          <p className="text-sm mb-1">
            <strong>{foundBook.title}</strong>
            {foundBook.authors ? ` / ${foundBook.authors}` : ''}
            {foundBook.bookType ? ` [${foundBook.bookType}]` : ''}
          </p>
          <p className="text-sm mb-1">УДК: {foundBook.udc || '(нет)'}</p>
          <p className="text-sm mb-1">ББК: {foundBook.bbk || '(нет)'}</p>
          <p className="text-sm mb-2">Лок. индекс: {foundBook.localIndex || '(нет)'}</p>

          {foundBook.bookCopies?.length ? (
            <ul className="list-disc list-inside text-sm mb-2">
              {foundBook.bookCopies.map((c) => {
                const borrowed = c.borrowRecords?.some((r) => !r.returnDate);
                return (
                  <li key={c.id}>
                    {c.copyInfo || `Экземпляр #${c.id}`} – {borrowed ? 'Выдан' : 'В наличии'}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm">Нет экземпляров</p>
          )}

          {filteredCopies.length > 0 && (
            <div className="flex flex-col mb-2">
              <label className="text-sm font-medium">
                {actionType === 'borrow'
                  ? 'Свободный экземпляр:'
                  : 'Выданный экземпляр:'}
              </label>
              <select
                value={selectedCopyId ?? ''}
                onChange={(e) => setSelectedCopyId(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none mt-1"
              >
                <option value="">-- не выбрано --</option>
                {filteredCopies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.copyInfo || `Экземпляр #${c.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {actionType === 'borrow' && filteredCopies.length > 0 && (
            <div className="flex flex-col mb-2">
              <label className="text-sm font-medium">Кому выдаём:</label>
              <select
                value={selectedPersonId ?? ''}
                onChange={(e) => setSelectedPersonId(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none mt-1"
              >
                <option value="">-- выберите --</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.lastName} {p.firstName}
                    {p.middleName ? ` ${p.middleName}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {actionType === 'borrow' && filteredCopies.length > 0 && (
          <button
            onClick={handleBorrow}
            disabled={!selectedCopyId}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded mr-2 disabled:opacity-50"
          >
            Выдать
          </button>
        )}
        {actionType === 'return' && filteredCopies.length > 0 && (
          <button
            onClick={handleReturn}
            disabled={!selectedCopyId}
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
          >
            Принять
          </button>
        )}
      </div>
    </div>
  );
};

export default BorrowReturn;