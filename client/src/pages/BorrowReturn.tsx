import React, { useState, useEffect } from 'react';
import type { Book, Person, BookCopy } from '../utils/interfaces.tsx';
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
    <div className="borrow-return-container">
      <h2>Выдача / Возврат</h2>
      <div className="form-group">
        <label>Действие:</label>
        <select value={actionType} onChange={handleActionTypeChange}>
          <option value="borrow">Выдать</option>
          <option value="return">Принять</option>
        </select>
      </div>
      <div className="form-group">
        <label>Локальный индекс:</label>
        <input
          type="text"
          placeholder="Введите индекс"
          value={bookLocalIndexQuery}
          onChange={(e) => setBookLocalIndexQuery(e.target.value)}
        />
        <button onClick={handleFindBook}>Найти</button>
      </div>

      {foundBook && (
        <div className="book-info">
          <h4>Найдена книга:</h4>
          <p>
            <strong>{foundBook.title}</strong>
            {foundBook.authors ? ` / ${foundBook.authors}` : ''}
            {foundBook.bookType ? ` [${foundBook.bookType}]` : ''}
          </p>
          <p>УДК: {foundBook.udc || '(нет)'}</p>
          <p>ББК: {foundBook.bbk || '(нет)'}</p>
          <p>Лок. индекс: {foundBook.localIndex || '(нет)'}</p>
          {foundBook.bookCopies?.length ? (
            <ul>
              {foundBook.bookCopies.map((c) => {
                const borrowed = c.borrowRecords?.some((r) => !r.returnDate);
                return (
                  <li key={c.id}>
                    {c.copyInfo || `Экземпляр #${c.id}`} - {borrowed ? 'Выдан' : 'В наличии'}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>Нет экземпляров</p>
          )}

          {filteredCopies.length > 0 && (
            <div className="form-group">
              <label>
                {actionType === 'borrow'
                  ? 'Свободный экземпляр:'
                  : 'Выданный экземпляр:'}
              </label>
              <select
                value={selectedCopyId ?? ''}
                onChange={(e) => setSelectedCopyId(Number(e.target.value))}
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
        </div>
      )}

      {actionType === 'borrow' && filteredCopies.length > 0 && (
        <div className="form-group">
          <label>Кому выдаём:</label>
          <select
            value={selectedPersonId ?? ''}
            onChange={(e) => setSelectedPersonId(Number(e.target.value))}
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

      <div className="form-group">
        {actionType === 'borrow' && filteredCopies.length > 0 && (
          <button onClick={handleBorrow} disabled={!selectedCopyId}>
            Выдать
          </button>
        )}
        {actionType === 'return' && filteredCopies.length > 0 && (
          <button onClick={handleReturn} disabled={!selectedCopyId}>
            Принять
          </button>
        )}
      </div>
    </div>
  );
};

export default BorrowReturn;