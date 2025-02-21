import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpClient.tsx';
import { toast } from 'react-toastify';

interface BorrowRecord {
  id: number;
  borrowDate: string | null;
  returnDate: string | null;
  acceptedByUser?: {
    id: number;
    username: string;
  };
  issuedByUser?: {
    id: number;
    username: string;
  };
}

interface Book {
  id: number;
  title: string;
  author: string;
  publishedYear: number;
  isbn?: string;
  localNumber?: string;
  borrowRecords?: BorrowRecord[];
}

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  groupName?: string;
}

type ActionType = 'borrow' | 'return';
type SearchType = 'isbn' | 'localNumber';

const BorrowReturn: React.FC = () => {
  const [actionType, setActionType] = useState<ActionType>('borrow');
  const [searchType, setSearchType] = useState<SearchType>('isbn');
  const [identifier, setIdentifier] = useState('');
  const [foundBook, setFoundBook] = useState<Book | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Загружаем список студентов при монтировании
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

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionType(e.target.value as ActionType);
    setFoundBook(null);
  };

  const handleSearchTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchType(e.target.value as SearchType);
    setFoundBook(null);
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value);
  };

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedStudentId(value ? Number(value) : null);
  };

  // Поиск книги по выбранному типу (isbn или localNumber)
  const findBook = async () => {
    if (!identifier.trim()) {
      toast.error('Введите значение для поиска');
      return;
    }
    try {
      const response = await httpClient.get<Book>(
        `/books/find?searchType=${encodeURIComponent(searchType)}&query=${encodeURIComponent(identifier)}`
      );
      setFoundBook(response.data);
    } catch (error) {
      console.error('Ошибка при поиске книги:', error);
      setFoundBook(null);
    }
  };

  // Выдача книги
  const borrowBook = async (bookId: number) => {
    if (!selectedStudentId) {
      toast.error('Выберите студента');
      return;
    }
    try {
      await httpClient.post('/borrow-records', {
        bookId,
        studentId: selectedStudentId,
      });
      toast.success('Книга успешно выдана');
      setFoundBook(null);
      setIdentifier('');
      setSelectedStudentId(null);
    } catch (error) {
      console.error('Ошибка при выдаче книги:', error);
    }
  };

  // Возврат книги
  const returnBook = async (book: Book) => {
    if (!book.borrowRecords) {
      return;
    }

    const activeRecord = book.borrowRecords.find((r) => !r.returnDate);
    if (!activeRecord) {
      return;
    }

    try {
      await httpClient.patch(`/borrow-records/${activeRecord.id}/return`, {});
      toast.success('Книга успешно возвращена');
      setFoundBook(null);
      setIdentifier('');
    } catch (error) {
      console.error('Ошибка при возврате книги:', error);
    }
  };

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

          <h4>История выдач:</h4>
          {foundBook.borrowRecords && foundBook.borrowRecords.length > 0 ? (
            <ul>
              {foundBook.borrowRecords.map((record) => (
                <li key={record.id}>
                  <strong>Выдана:</strong> {record.borrowDate || 'неизвестно'};{' '}
                  {record.returnDate ? (
                    <>
                      <strong>вернули:</strong> {record.returnDate}
                      {record.acceptedByUser &&
                        ` (принял: ${record.acceptedByUser.username || record.acceptedByUser.id})`}
                    </>
                  ) : (
                    'ещё не вернули'
                  )}
                  {record.issuedByUser &&
                    `; выдал: ${record.issuedByUser.username || record.issuedByUser.id}`}
                </li>
              ))}
            </ul>
          ) : (
            <p>Эту книгу ещё никто не брал.</p>
          )}

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

              <button onClick={() => borrowBook(foundBook.id)} className="action-button">
                Выдать книгу
              </button>
            </>
          )}

          {actionType === 'return' && (
            <button onClick={() => returnBook(foundBook)} className="action-button">
              Принять книгу
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BorrowReturn;