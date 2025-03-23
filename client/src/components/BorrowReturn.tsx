import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Book, BorrowRecord, Person, BookCopy } from '../interfaces';
import httpClient from '../utils/httpsClient.tsx';

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
        const response = await httpClient.get<Person[]>('/persons');
        setPersons(response.data);
      } catch (error) {
        console.error('Ошибка при получении списка людей:', error);
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
      toast.error('Введите локальный индекс для поиска книги');
      return;
    }

    try {
      const url = `/books/find?searchType=local_index&query=${encodeURIComponent(bookLocalIndexQuery)}`;
      const response = await httpClient.get<Book>(url);
      setFoundBook(response.data);
      setSelectedCopyId(null);
    } catch (error) {
      console.error('Ошибка при поиске книги:', error);
      toast.error('Книга не найдена');
      setFoundBook(null);
    }
  };

  const refetchBook = async () => {
    if (!bookLocalIndexQuery) return;
    try {
      const url = `/books/find?searchType=local_index&query=${encodeURIComponent(bookLocalIndexQuery)}`;
      const response = await httpClient.get<Book>(url);
      setFoundBook(response.data);
    } catch (error) {
      console.error('Ошибка при обновлении данных о книге:', error);
    }
  };

  const handleBorrow = async () => {
    if (!foundBook || !selectedCopyId || !selectedPersonId) {
      toast.error('Пожалуйста, выберите книгу, экземпляр и человека');
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
    } catch (error: any) {
      console.error('Ошибка при выдаче книги:', error);
      toast.error(error.response?.status === 409 ? 'Этот экземпляр уже находится на руках!' : 'Не удалось выдать книгу');
    }
  };

  const handleReturn = async () => {
    if (!foundBook || !selectedCopyId) {
      toast.error('Сначала найдите книгу и выберите экземпляр');
      return;
    }

    const copy = foundBook.bookCopies?.find((c) => c.id === selectedCopyId);
    if (!copy || !copy.borrowRecords) {
      toast.error('Нет записей о выдаче для этого экземпляра');
      return;
    }

    const activeRecord = copy.borrowRecords.find((r) => !r.returnDate);
    if (!activeRecord) {
      toast.info('Этот экземпляр не находится на руках');
      return;
    }

    try {
      await httpClient.patch(`/borrow-records/${activeRecord.id}/return`, {});
      toast.success('Книга успешно возвращена');
      await refetchBook();
      setSelectedCopyId(null);
    } catch (error) {
      console.error('Ошибка при возврате книги:', error);
      toast.error('Не удалось вернуть книгу');
    }
  };

  const getFilteredCopies = () => {
    if (!foundBook?.bookCopies || foundBook.bookCopies.length === 0) return [];
    return foundBook.bookCopies.filter((copy) => {
      const isBorrowed = copy.borrowRecords?.some((r) => !r.returnDate);
      return actionType === 'borrow' ? !isBorrowed : isBorrowed;
    });
  };

  const filteredCopies = getFilteredCopies();

  const renderCopyStatus = (copy: BookCopy) => {
    const isBorrowed = copy.borrowRecords?.some((record) => !record.returnDate);
    return isBorrowed ? 'Выдан' : 'В наличии';
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
          {foundBook?.bookCopies?.length ? (
            <ul>
              {foundBook.bookCopies.map((copy) => (
                <li key={copy.id}>
                  {copy.copyInfo || `Экземпляр #${copy.id}`} - {renderCopyStatus(copy)}
                </li>
              ))}
            </ul>
          ) : (
            <p>Нет экземпляров</p>
          )}

          {/* Выбор экземпляра (только подходящие) */}
          {filteredCopies.length > 0 && (
            <div className="form-group">
              <label>
                {actionType === 'borrow' ? 'Выберите свободный экземпляр:' : 'Выберите выданный экземпляр:'}
              </label>
              <select
                value={selectedCopyId || ''}
                onChange={(e) => setSelectedCopyId(Number(e.target.value))}
                disabled={filteredCopies.length === 0}
              >
                <option value="">-- не выбрано --</option>
                {filteredCopies.map((copy) => (
                  <option key={copy.id} value={copy.id}>
                    {copy.copyInfo || `Экземпляр #${copy.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filteredCopies.length === 0 && <p>Нет доступных экземпляров</p>}
        </div>
      )}

      {/* Блок выбора человека (только для выдачи) */}
      {actionType === 'borrow' && filteredCopies.length > 0 && (
        <div className="form-group">
          <label>Кому выдаём:</label>
          <select
            value={selectedPersonId || ''}
            onChange={(e) => setSelectedPersonId(Number(e.target.value))}
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
        {actionType === 'borrow' && filteredCopies.length > 0 && (
          <button onClick={handleBorrow} disabled={!selectedCopyId}>
            Выдать книгу (экземпляр)
          </button>
        )}
        {actionType === 'return' && filteredCopies.length > 0 && (
          <button onClick={handleReturn} disabled={!selectedCopyId}>
            Принять (возврат)
          </button>
        )}
      </div>
    </div>
  );
};

export default BorrowReturn;