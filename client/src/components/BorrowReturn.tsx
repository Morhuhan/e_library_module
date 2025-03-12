import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpClient.tsx';
import { toast } from 'react-toastify';

interface User {
  id: number;
  username?: string;
}

interface BorrowRecord {
  id: number;
  borrowDate: string | null;
  returnDate: string | null;
  acceptedByUser?: User;
  issuedByUser?: User;
}

interface BookCopy {
  id: number;
  inventoryNumber: string;
  borrowRecords?: BorrowRecord[];
}

interface Book {
  id: number;
  title: string;
  author: string;
  publishedYear: number;
  isbn?: string;
  localNumber?: string; 
  // У книги есть список экземпляров
  bookCopies?: BookCopy[];
}

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  groupName?: string;
}

type ActionType = 'borrow' | 'return';
type SearchType = 'isbn' | 'localNumber'; // или иной набор полей, если надо

const BorrowReturn: React.FC = () => {
  const [actionType, setActionType] = useState<ActionType>('borrow');
  const [searchType, setSearchType] = useState<SearchType>('isbn');
  const [identifier, setIdentifier] = useState('');
  const [foundBook, setFoundBook] = useState<Book | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Здесь храним выбранный экземпляр для операций
  const [selectedCopyId, setSelectedCopyId] = useState<number | null>(null);

  // Загружаем список студентов
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await httpClient.get<Student[]>('/students');
        setStudents(response.data);
      } catch (error) {
        console.error('Ошибка при получении списка студентов', error);
      }
    };
    fetchStudents();
  }, []);

  // Смена вида операции (выдача/возврат)
  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionType(e.target.value as ActionType);
    setFoundBook(null);
    setIdentifier('');
    setSelectedCopyId(null);
  };

  // Смена типа поиска (ISBN, localNumber, etc.)
  const handleSearchTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchType(e.target.value as SearchType);
    setFoundBook(null);
    setIdentifier('');
    setSelectedCopyId(null);
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value);
  };

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedStudentId(value ? Number(value) : null);
  };

  // Смена выбранного экземпляра
  const handleCopyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCopyId(value ? Number(value) : null);
  };

  // Поиск книги по выбранному полю (isbn, localNumber)
  const findBook = async () => {
    if (!identifier.trim()) {
      toast.error('Введите значение для поиска');
      return;
    }
    try {
      // Эндпоинт с учётом вашего бэкенда
      const response = await httpClient.get<Book>(
        `/books/find?searchType=${encodeURIComponent(searchType)}&query=${encodeURIComponent(identifier)}`
      );
      setFoundBook(response.data);
      setSelectedCopyId(null);
    } catch (error) {
      console.error('Ошибка при поиске книги:', error);
      toast.error('Книга не найдена');
      setFoundBook(null);
    }
  };

  // Выдача книги (на конкретный экземпляр)
  const borrowBook = async () => {
    if (!foundBook) return;
    if (!selectedStudentId) {
      toast.error('Выберите студента');
      return;
    }
    if (!selectedCopyId) {
      toast.error('Выберите экземпляр');
      return;
    }

    try {
      // Отправляем запрос с bookCopyId
      await httpClient.post('/borrow-records', {
        bookCopyId: selectedCopyId,
        studentId: selectedStudentId,
      });
      toast.success('Книга успешно выдана');
      setFoundBook(null);
      setIdentifier('');
      setSelectedStudentId(null);
      setSelectedCopyId(null);
    } catch (error) {
      console.error('Ошибка при выдаче книги:', error);
      toast.error('Не удалось выдать книгу');
    }
  };

  // Возврат книги (на конкретный экземпляр)
  // Логика: ищем активную запись в chosen BookCopy
  const returnBook = async () => {
    if (!foundBook || !foundBook.bookCopies) return;
    if (!selectedCopyId) {
      toast.error('Выберите экземпляр');
      return;
    }

    // Находим экземпляр
    const selectedCopy = foundBook.bookCopies.find((c) => c.id === selectedCopyId);
    if (!selectedCopy || !selectedCopy.borrowRecords) {
      toast.error('У экземпляра нет записей о выдаче');
      return;
    }
    // Ищем незакрытую запись
    const activeRecord = selectedCopy.borrowRecords.find((r) => !r.returnDate);
    if (!activeRecord) {
      toast.info('Этот экземпляр уже возвращён или не выдавался.');
      return;
    }

    try {
      await httpClient.patch(`/borrow-records/${activeRecord.id}/return`, {});
      toast.success('Книга успешно возвращена');
      setFoundBook(null);
      setIdentifier('');
      setSelectedCopyId(null);
    } catch (error) {
      console.error('Ошибка при возврате книги:', error);
      toast.error('Не удалось вернуть книгу');
    }
  };

  // Собираем все записи о выдаче (по всем экземплярам), чтобы отобразить историю
  const getAllBorrowRecords = (): BorrowRecord[] => {
    if (!foundBook?.bookCopies) return [];
    return foundBook.bookCopies.flatMap((copy) => copy.borrowRecords || []);
  };

  // Массив всех записей
  const allRecords = getAllBorrowRecords();

  return (
    <div className="action-container">
      <h2>Выдать или принять книгу</h2>

      <div className="form-group">
        <label htmlFor="actionType">Действие:</label>
        <select
          id="actionType"
          value={actionType}
          onChange={handleActionChange}
          className="select-input"
        >
          <option value="borrow">Выдать</option>
          <option value="return">Принять (возврат)</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="searchType">Искать по:</label>
        <select
          id="searchType"
          value={searchType}
          onChange={handleSearchTypeChange}
          className="select-input"
        >
          <option value="isbn">ISBN</option>
          <option value="localNumber">Локальный номер</option>
          {/* Если хотите искать по инвентарному номеру, нужно иной эндпоинт (book-copies/find) */}
        </select>
      </div>

      <div className="form-group">
        <input
          type="text"
          placeholder="Введите значение для поиска"
          value={identifier}
          onChange={handleIdentifierChange}
          className="text-input"
        />
      </div>

      <button onClick={findBook} className="action-button">
        Найти книгу
      </button>

      {foundBook && (
        <div className="book-info">
          <h3>{foundBook.title}</h3>
          <p>Автор: {foundBook.author}</p>
          <p>Год издания: {foundBook.publishedYear}</p>
          {foundBook.isbn && <p>ISBN: {foundBook.isbn}</p>}
          {foundBook.localNumber && <p>Локальный номер: {foundBook.localNumber}</p>}

          {/* Список экземпляров */}
          <h4>Экземпляры книги:</h4>
          {foundBook.bookCopies && foundBook.bookCopies.length > 0 ? (
            <ul>
              {foundBook.bookCopies.map((copy) => {
                // проверяем, свободен ли экземпляр
                const activeBorrow = copy.borrowRecords?.some((r) => !r.returnDate);
                return (
                  <li key={copy.id}>
                    Инв. номер: {copy.inventoryNumber} {activeBorrow ? '(Выдан)' : '(Свободен)'}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>У этой книги нет экземпляров.</p>
          )}

          {/* История по всем экземплярам */}
          <h4>История выдач (все экземпляры):</h4>
          {allRecords.length > 0 ? (
            <ul>
              {allRecords.map((record) => (
                <li key={record.id}>
                  <strong>Record #{record.id}:</strong> Выдан {record.borrowDate || '?'};{' '}
                  {record.returnDate
                    ? `вернули: ${record.returnDate}`
                    : 'ещё не вернули'}
                  {'; '}
                  {record.issuedByUser && `выдал: ${record.issuedByUser.username}`}
                  {record.acceptedByUser && `, принял: ${record.acceptedByUser.username}`}
                </li>
              ))}
            </ul>
          ) : (
            <p>Нет записей о выдаче.</p>
          )}

          {/* Выбор экземпляра и кнопки действия */}
          <div className="form-group">
            <label htmlFor="copySelect">Выберите экземпляр:</label>
            <select
              id="copySelect"
              value={selectedCopyId || ''}
              onChange={handleCopyChange}
              className="select-input"
            >
              <option value="">-- Не выбрано --</option>
              {foundBook.bookCopies?.map((copy) => {
                const isBorrowed = copy.borrowRecords?.some((r) => !r.returnDate);
                return (
                  <option key={copy.id} value={copy.id}>
                    {copy.inventoryNumber} {isBorrowed ? '(выдан)' : '(свободен)'}
                  </option>
                );
              })}
            </select>
          </div>

          {actionType === 'borrow' && (
            <>
              <div className="form-group">
                <label htmlFor="studentSelect">Студент:</label>
                <select
                  id="studentSelect"
                  value={selectedStudentId || ''}
                  onChange={handleStudentChange}
                  className="select-input"
                >
                  <option value="">-- Выберите студента --</option>
                  {students.map((student) => (
                    <option value={student.id} key={student.id}>
                      {student.lastName} {student.firstName}
                      {student.middleName ? ` ${student.middleName}` : ''}
                      {student.groupName ? ` (${student.groupName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={borrowBook} className="action-button">
                Выдать книгу
              </button>
            </>
          )}

          {actionType === 'return' && (
            <button onClick={returnBook} className="action-button">
              Принять книгу
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BorrowReturn;