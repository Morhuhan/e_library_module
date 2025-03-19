import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Book, BorrowRecord, Person } from '../interfaces'; 
import httpClient from '../utils/httpsClient.tsx';

type ActionType = 'borrow' | 'return';

const BorrowReturn: React.FC = () => {
  const [actionType, setActionType] = useState<ActionType>('borrow');

  // Поле для ввода ISBN
  const [bookIsbnQuery, setBookIsbnQuery] = useState('');
  // Найденная книга
  const [foundBook, setFoundBook] = useState<Book | null>(null);
  // Выбранный экземпляр книги
  const [selectedCopyId, setSelectedCopyId] = useState<number | null>(null);

  // Список всех Person
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  // Получение списка Person (студентов/преподавателей) при монтировании
  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const response = await httpClient.get<Person[]>('/persons');
        setPersons(response.data);
      } catch (error) {
        console.error('Ошибка при получении списка людей:', error);
      }
    };
    fetchPersons();
  }, []);

  // Сброс текущего состояния
  const resetAllStates = () => {
    setFoundBook(null);
    setSelectedCopyId(null);
    setBookIsbnQuery('');
    setSelectedPersonId(null);
  };

  // Переключение типа действия
  const handleActionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionType(e.target.value as ActionType);
    resetAllStates();
  };

  // Поиск книги по ISBN
  const handleFindBook = async () => {
    if (!bookIsbnQuery.trim()) {
      toast.error('Введите ISBN для поиска книги');
      return;
    }
    try {
      const response = await httpClient.get<Book>(
        `/books/find?searchType=isbn&query=${encodeURIComponent(bookIsbnQuery)}`
      );
      setFoundBook(response.data);
      setSelectedCopyId(null);
    } catch (error) {
      console.error('Ошибка при поиске книги:', error);
      toast.error('Книга не найдена');
      setFoundBook(null);
    }
  };

  // Выбор экземпляра из найденной книги
  const handleCopySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCopyId(val ? Number(val) : null);
  };

  // Выбор человека
  const handlePersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPersonId(val ? Number(val) : null);
  };

  // Функция повторного обновления (re-fetch) книги после операции
  const refetchBook = async () => {
    if (!bookIsbnQuery) return;
    try {
      const response = await httpClient.get<Book>(
        `/books/find?searchType=isbn&query=${encodeURIComponent(bookIsbnQuery)}`
      );
      setFoundBook(response.data);
    } catch (error) {
      console.error('Ошибка при обновлении данных книги:', error);
      // Здесь не обязательно показывать toast, но можно
    }
  };

  // Выдать книгу
  const handleBorrow = async () => {
    if (!foundBook || !selectedCopyId) {
      toast.error('Сначала найдите книгу и выберите экземпляр');
      return;
    }
    if (!selectedPersonId) {
      toast.error('Выберите человека, которому выдаёте книгу');
      return;
    }
    try {
      await httpClient.post('/borrow-records', {
        bookCopyId: selectedCopyId,
        personId: selectedPersonId,
      });
      toast.success('Книга успешно выдана');
      // 1) Можем оставить "resetAllStates()", но тогда пользователь всё забудет
      // 2) Или перезапросить книгу, чтобы увидеть обновлённый статус экземпляра
      // Выберем перезапрос, чтобы пользователь остался на этой же книге
      await refetchBook();
      setSelectedCopyId(null);
      setSelectedPersonId(null);
    } catch (error: any) {
      console.error('Ошибка при выдаче книги:', error);
      if (error.response?.status === 409) {
        // Например, если на бэке вернули Conflict (duplicate key)
        toast.error('Этот экземпляр уже находится на руках!');
      } else {
        toast.error('Не удалось выдать книгу');
      }
    }
  };

  // Вернуть книгу
  const handleReturn = async () => {
    if (!foundBook || !selectedCopyId) {
      toast.error('Сначала найдите книгу и выберите экземпляр');
      return;
    }
    // Ищем экземпляр
    const copy = foundBook.bookCopies?.find((c) => c.id === selectedCopyId);
    if (!copy || !copy.borrowRecords) {
      toast.error('Нет записей о выдаче для этого экземпляра');
      return;
    }
    // Находим активную запись
    const activeRecord = copy.borrowRecords.find((r) => !r.returnDate);
    if (!activeRecord) {
      toast.info('Этот экземпляр не находится на руках');
      return;
    }
    try {
      await httpClient.patch(`/borrow-records/${activeRecord.id}/return`, {});
      toast.success('Книга успешно возвращена');
      // Также перезапрашиваем данные
      await refetchBook();
      setSelectedCopyId(null);
    } catch (error) {
      console.error('Ошибка при возврате книги:', error);
      toast.error('Не удалось вернуть книгу');
    }
  };

  // История выдач (все экземпляры) — если хотите отображать
  const getAllBorrowRecords = (): BorrowRecord[] => {
    if (!foundBook?.bookCopies) return [];
    return foundBook.bookCopies.flatMap((c) => c.borrowRecords ?? []);
  };

  return (
    <div className="borrow-return-container">
      <h2>Выдача / Приём книг</h2>

      {/* Выбор действия */}
      <div className="form-group">
        <label>Действие:</label>
        <select value={actionType} onChange={handleActionTypeChange}>
          <option value="borrow">Выдать</option>
          <option value="return">Принять (возврат)</option>
        </select>
      </div>

      {/* Поле ввода ISBN и поиск */}
      <div className="form-group">
        <label>ISBN книги:</label>
        <input
          type="text"
          placeholder="Введите ISBN"
          value={bookIsbnQuery}
          onChange={(e) => setBookIsbnQuery(e.target.value)}
        />
        <button onClick={handleFindBook}>Найти книгу</button>
      </div>

      {foundBook && (
        <div className="book-info">
          <h4>Найдена книга:</h4>
          <p>
            <strong>{foundBook.title}</strong> / {foundBook.author} ({foundBook.publishedYear})
          </p>
          <p>ISBN: {foundBook.isbn || '(нет)'}</p>

          <h5>Экземпляры:</h5>
          {foundBook.bookCopies?.length ? (
            <>
              <ul>
                {foundBook.bookCopies.map((copy) => {
                  const borrowed = copy.borrowRecords?.some((r) => !r.returnDate);
                  return (
                    <li key={copy.id}>
                      {copy.inventoryNumber} {borrowed ? '(выдан)' : '(свободен)'}
                    </li>
                  );
                })}
              </ul>
              <div className="form-group">
                <label>Выберите экземпляр:</label>
                <select
                  value={selectedCopyId || ''}
                  onChange={handleCopySelectChange}
                >
                  <option value="">-- не выбрано --</option>
                  {foundBook.bookCopies.map((copy) => {
                    const isBorrowed = copy.borrowRecords?.some((r) => !r.returnDate);
                    return (
                      <option key={copy.id} value={copy.id}>
                        {copy.inventoryNumber} {isBorrowed ? '(выдан)' : '(свободен)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <h5>История выдач (все экземпляры):</h5>
              {getAllBorrowRecords().length > 0 ? (
                <ul>
                  {getAllBorrowRecords().map((record) => (
                    <li key={record.id}>
                      Запись #{record.id}: выдан {record.borrowDate || '?'};{' '}
                      {record.returnDate ? `вернули ${record.returnDate}` : 'ещё не вернули'};{' '}
                      {record.issuedByUser && `выдал: ${record.issuedByUser.username}`}
                      {record.acceptedByUser && `; принял: ${record.acceptedByUser.username}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Нет записей о выдаче</p>
              )}
            </>
          ) : (
            <p>Нет экземпляров</p>
          )}
        </div>
      )}

      {/* Блок выбора получателя, если выдаём книгу */}
      {actionType === 'borrow' && (
        <div className="form-group">
          <label>Кому выдаём:</label>
          <select
            value={selectedPersonId || ''}
            onChange={handlePersonChange}
          >
            <option value="">-- выберите человека --</option>
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
        {actionType === 'borrow' && (
          <button onClick={handleBorrow}>Выдать книгу (экземпляр)</button>
        )}
        {actionType === 'return' && (
          <button onClick={handleReturn}>Принять (возврат)</button>
        )}
      </div>
    </div>
  );
};

export default BorrowReturn;