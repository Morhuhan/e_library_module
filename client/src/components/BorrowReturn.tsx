import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Book, BorrowRecord, Person } from '../interfaces'; 
import httpClient from '../utils/httpsClient.tsx';

type ActionType = 'borrow' | 'return';

const BorrowReturn: React.FC = () => {
  const [actionType, setActionType] = useState<ActionType>('borrow');

  // Поле для ввода "локального индекса" или другого идентификатора
  const [bookLocalIndexQuery, setBookLocalIndexQuery] = useState('');

  // Найденная книга
  const [foundBook, setFoundBook] = useState<Book | null>(null);
  // Выбранный экземпляр книги
  const [selectedCopyId, setSelectedCopyId] = useState<number | null>(null);

  // Список всех Person
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  // Получение списка Person при монтировании
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

  // Сброс состояния
  const resetAllStates = () => {
    setFoundBook(null);
    setSelectedCopyId(null);
    setBookLocalIndexQuery('');
    setSelectedPersonId(null);
  };

  // Переключение типа действия (выдать/вернуть) — сбрасываем поля
  const handleActionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionType(e.target.value as ActionType);
    resetAllStates();
  };

  // Поиск книги по localIndex
  const handleFindBook = async () => {
    if (!bookLocalIndexQuery.trim()) {
      toast.error('Введите локальный индекс для поиска книги');
      return;
    }
    try {
      // ВАЖНО: encodeURIComponent(bookLocalIndexQuery)
      const url = `/books/find?searchType=local_index&query=${encodeURIComponent(
        bookLocalIndexQuery
      )}`;
      const response = await httpClient.get<Book>(url);
      setFoundBook(response.data);
      setSelectedCopyId(null);
    } catch (error) {
      console.error('Ошибка при поиске книги:', error);
      toast.error('Книга не найдена');
      setFoundBook(null);
    }
  };

  // Выбор экземпляра книги из списка
  const handleCopySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCopyId(val ? Number(val) : null);
  };

  // Выбор человека
  const handlePersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPersonId(val ? Number(val) : null);
  };

  // Повторный запрос книги, чтобы обновить состояние (borrowRecords)
  const refetchBook = async () => {
    if (!bookLocalIndexQuery) return;
    try {
      const url = `/books/find?searchType=local_index&query=${encodeURIComponent(
        bookLocalIndexQuery
      )}`;
      const response = await httpClient.get<Book>(url);
      setFoundBook(response.data);
    } catch (error) {
      console.error('Ошибка при обновлении данных о книге:', error);
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
      // Перезапрашиваем книгу, чтобы увидеть обновлённый статус
      await refetchBook();
      setSelectedCopyId(null);
      setSelectedPersonId(null);
    } catch (error: any) {
      console.error('Ошибка при выдаче книги:', error);
      if (error.response?.status === 409) {
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
    // Находим экземпляр
    const copy = foundBook.bookCopies?.find((c) => c.id === selectedCopyId);
    if (!copy || !copy.borrowRecords) {
      toast.error('Нет записей о выдаче для этого экземпляра');
      return;
    }
    // Ищем активную (не возвращённую) запись
    const activeRecord = copy.borrowRecords.find((r) => !r.returnDate);
    if (!activeRecord) {
      toast.info('Этот экземпляр не находится на руках');
      return;
    }
    try {
      await httpClient.patch(`/borrow-records/${activeRecord.id}/return`, {});
      toast.success('Книга успешно возвращена');
      // Перезапрашиваем
      await refetchBook();
      setSelectedCopyId(null);
    } catch (error) {
      console.error('Ошибка при возврате книги:', error);
      toast.error('Не удалось вернуть книгу');
    }
  };

  // Можно показать всю историю выдач по книге (всех её экземплярах)
  const getAllBorrowRecords = (): BorrowRecord[] => {
    if (!foundBook?.bookCopies) return [];
    return foundBook.bookCopies.flatMap((c) => c.borrowRecords || []);
  };

  return (
    <div className="borrow-return-container">
      <h2>Выдача / Возврат книг</h2>

      {/* Тип действия */}
      <div className="form-group">
        <label>Действие:</label>
        <select value={actionType} onChange={handleActionTypeChange}>
          <option value="borrow">Выдать</option>
          <option value="return">Принять (возврат)</option>
        </select>
      </div>

      {/* Поиск книги по localIndex */}
      <div className="form-group">
        <label>Локальный индекс книги (или другой идентификатор):</label>
        <input
          type="text"
          placeholder="Введите локальный индекс"
          value={bookLocalIndexQuery}
          onChange={(e) => setBookLocalIndexQuery(e.target.value)}
        />
        <button onClick={handleFindBook}>Найти книгу</button>
      </div>

      {/* Найденная книга */}
      {foundBook && (
        <div className="book-info">
          <h4>Найдена книга:</h4>
          <p>
            <strong>{foundBook.title}</strong>{' '}
            {foundBook.authors ? ` / ${foundBook.authors}` : ''}
            {foundBook.bookType ? ` [${foundBook.bookType}]` : ''}
          </p>
          <p>УДК: {foundBook.udc || '(нет)'}</p>
          <p>ББК: {foundBook.bbk || '(нет)'}</p>
          <p>Локальный индекс: {foundBook.localIndex || '(нет)'}</p>

          <h5>Экземпляры:</h5>
          {foundBook.bookCopies?.length ? (
            <>
              <ul>
                {foundBook.bookCopies.map((copy) => {
                  const borrowed = copy.borrowRecords?.some((r) => !r.returnDate);
                  return (
                    <li key={copy.id}>
                      {copy.copyInfo
                        ? copy.copyInfo
                        : `Экземпляр #${copy.id}`}
                      {' '}
                      {borrowed ? '(выдан)' : '(свободен)'}
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
                        {copy.copyInfo
                          ? copy.copyInfo
                          : `Экземпляр #${copy.id}`}
                        {' '}
                        {isBorrowed ? '(выдан)' : '(свободен)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <h5>История выдач (по всем экземплярам):</h5>
              {getAllBorrowRecords().length > 0 ? (
                <ul>
                  {getAllBorrowRecords().map((record) => (
                    <li key={record.id}>
                      Запись #{record.id}: выдана {record.borrowDate || '?'}
                      {record.returnDate
                        ? `; вернули ${record.returnDate}`
                        : '; ещё не вернули'}
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

      {/* Блок выбора человека (только для выдачи) */}
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

      {/* Кнопки действий */}
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