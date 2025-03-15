import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Book, BookCopy, BorrowRecord, Student } from '../interfaces.tsx';
import httpClient from '../utils/httpClient.tsx';

// Типы для нашего компонента
type ActionType = 'borrow' | 'return';
type SearchMode = 'byBook' | 'byCopy'; 

const BorrowReturn: React.FC = () => {
  // Выдача или возврат
  const [actionType, setActionType] = useState<ActionType>('borrow');

  // Режим поиска: либо "по книге", либо "по экземпляру"
  const [searchMode, setSearchMode] = useState<SearchMode>('byBook');

  // --- Данные для "по книге" ---
  // Поле, по которому ищем книгу (здесь — только ISBN, если хотите другое, добавьте)
  const [bookIsbnQuery, setBookIsbnQuery] = useState('');
  const [foundBook, setFoundBook] = useState<Book | null>(null);
  const [selectedCopyId, setSelectedCopyId] = useState<number | null>(null);

  // --- Данные для "по экземпляру" ---
  const [copyInvNumber, setCopyInvNumber] = useState('');
  const [foundCopy, setFoundCopy] = useState<BookCopy | null>(null);

  // Общая логика: при выдаче нужно выбрать студента
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Загружаем список студентов один раз при монтировании компонента
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

  // Изменение типа действия (выдача/возврат)
  const handleActionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionType(e.target.value as ActionType);
    resetAllStates();
  };

  // Изменение режима поиска (по книге или по экземпляру)
  const handleSearchModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchMode(e.target.value as SearchMode);
    resetAllStates();
  };

  // Сброс всех промежуточных состояний
  const resetAllStates = () => {
    setFoundBook(null);
    setSelectedCopyId(null);
    setBookIsbnQuery('');
    setFoundCopy(null);
    setCopyInvNumber('');
    setSelectedStudentId(null);
  };

  // --- Поиск книги по ISBN ---
  const handleFindBook = async () => {
    if (!bookIsbnQuery.trim()) {
      toast.error('Введите ISBN для поиска книги');
      return;
    }
    try {
      // Предположим, что на бэке есть эндпоинт:
      // GET /books/find?searchType=isbn&query=...
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

  // --- Поиск экземпляра по инвентарному номеру ---
  const handleFindCopy = async () => {
    if (!copyInvNumber.trim()) {
      toast.error('Введите инвентарный номер');
      return;
    }
    try {
      // Предположим, что на бэке есть эндпоинт:
      // GET /book-copies/find/by-inv?invNumber=...
      const response = await httpClient.get<BookCopy>(
        `/book-copies/find/by-inv?invNumber=${encodeURIComponent(copyInvNumber)}`
      );
      setFoundCopy(response.data);
    } catch (error) {
      console.error('Ошибка при поиске экземпляра:', error);
      toast.error('Экземпляр не найден');
      setFoundCopy(null);
    }
  };

  // --- Обработка выбора экземпляра в режиме "byBook" ---
  const handleCopySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCopyId(val ? Number(val) : null);
  };

  // --- Выбор студента (общий для обоих режимов) ---
  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedStudentId(val ? Number(val) : null);
  };

  // --- "Выдать книгу" (borrow) ---
  const handleBorrow = async () => {
    let copyId: number | null = null;

    if (searchMode === 'byBook') {
      // Используем selectedCopyId
      if (!selectedCopyId) {
        toast.error('Выберите экземпляр книги');
        return;
      }
      copyId = selectedCopyId;
    } else {
      // byCopy — у нас есть foundCopy
      if (!foundCopy) {
        toast.error('Сначала найдите экземпляр');
        return;
      }
      copyId = foundCopy.id;
    }

    if (!selectedStudentId) {
      toast.error('Выберите студента');
      return;
    }

    try {
      await httpClient.post('/borrow-records', {
        bookCopyId: copyId,
        studentId: selectedStudentId,
      });
      toast.success('Книга успешно выдана');
      resetAllStates();
    } catch (error) {
      console.error('Ошибка при выдаче книги:', error);
      toast.error('Не удалось выдать книгу');
    }
  };

  // --- "Принять книгу" (return) ---
  const handleReturn = async () => {
    // Нужно найти активную запись borrowRecords (без returnDate)
    // для выбранного экземпляра (byBook) или найденного (byCopy)
    let copy: BookCopy | null = null;

    if (searchMode === 'byBook') {
      if (!foundBook || !foundBook.bookCopies) {
        toast.error('Сначала найдите книгу и её экземпляры');
        return;
      }
      if (!selectedCopyId) {
        toast.error('Выберите экземпляр');
        return;
      }
      copy = foundBook.bookCopies.find((c) => c.id === selectedCopyId) || null;
    } else {
      if (!foundCopy) {
        toast.error('Сначала найдите экземпляр');
        return;
      }
      copy = foundCopy;
    }

    if (!copy || !copy.borrowRecords) {
      toast.error('У экземпляра нет записей о выдаче');
      return;
    }

    // Ищем незакрытую запись
    const activeRecord = copy.borrowRecords.find((r) => !r.returnDate);
    if (!activeRecord) {
      toast.info('Этот экземпляр уже возвращён или не выдавался.');
      return;
    }

    // Делаем PATCH /borrow-records/:id/return
    try {
      await httpClient.patch(`/borrow-records/${activeRecord.id}/return`, {});
      toast.success('Книга успешно возвращена');
      resetAllStates();
    } catch (error) {
      console.error('Ошибка при возврате книги:', error);
      toast.error('Не удалось вернуть книгу');
    }
  };

  // --- Вспомогательная функция: история выдач для "byBook" ---
  const getAllBorrowRecords = (): BorrowRecord[] => {
    if (!foundBook || !foundBook.bookCopies) return [];
    return foundBook.bookCopies.flatMap((copy) => copy.borrowRecords || []);
  };

  // --- Вспомогательная функция: история для одного найденного экземпляра (byCopy) ---
  const getCopyBorrowRecords = (): BorrowRecord[] => {
    if (!foundCopy || !foundCopy.borrowRecords) return [];
    return foundCopy.borrowRecords;
  };

  return (
    <div className="borrow-return-container">
      <h2>Выдача / Приём книг</h2>

      {/* Выбор действия: Выдать или Вернуть */}
      <div className="form-group">
        <label htmlFor="actionType">Действие:</label>
        <select id="actionType" value={actionType} onChange={handleActionTypeChange}>
          <option value="borrow">Выдать</option>
          <option value="return">Принять (возврат)</option>
        </select>
      </div>

      {/* Режим поиска: byBook / byCopy */}
      <div className="form-group">
        <label htmlFor="searchMode">Режим поиска:</label>
        <select id="searchMode" value={searchMode} onChange={handleSearchModeChange}>
          <option value="byBook">Сначала выбрать книгу</option>
          <option value="byCopy">Сразу искать экземпляр</option>
        </select>
      </div>

      {/* --- РЕЖИМ byBook --- */}
      {searchMode === 'byBook' && (
        <div className="by-book-section">
          <h3>Поиск книги по ISBN</h3>
          <div className="form-group">
            <input
              type="text"
              placeholder="Введите ISBN книги"
              value={bookIsbnQuery}
              onChange={(e) => setBookIsbnQuery(e.target.value)}
            />
            <button onClick={handleFindBook}>Найти книгу</button>
          </div>

          {/* Если книга найдена, показываем инфо и список экземпляров */}
          {foundBook && (
            <div className="book-info">
              <h4>Найдена книга:</h4>
              <p>
                <strong>{foundBook.title}</strong> / {foundBook.author} ({foundBook.publishedYear})
              </p>
              {foundBook.isbn && <p>ISBN: {foundBook.isbn}</p>}

              {/* Список экземпляров */}
              <h5>Экземпляры:</h5>
              {foundBook.bookCopies && foundBook.bookCopies.length > 0 ? (
                <ul>
                  {foundBook.bookCopies.map((copy) => {
                    const borrowed = copy.borrowRecords?.some((r) => !r.returnDate);
                    return (
                      <li key={copy.id}>
                        {copy.inventoryNumber}{' '}
                        {borrowed ? <span>(выдан)</span> : <span>(свободен)</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>Нет экземпляров</p>
              )}

              {/* Выбор экземпляра */}
              <div className="form-group">
                <label htmlFor="copySelect">Выберите экземпляр для операции:</label>
                <select
                  id="copySelect"
                  value={selectedCopyId || ''}
                  onChange={handleCopySelectChange}
                >
                  <option value="">-- не выбрано --</option>
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

              {/* История выдач для всей книги (все её экземпляры) */}
              <h5>История выдач (по всем экземплярам):</h5>
              {getAllBorrowRecords().length > 0 ? (
                <ul>
                  {getAllBorrowRecords().map((record) => (
                    <li key={record.id}>
                      <strong>Запись #{record.id}</strong>: выдан {record.borrowDate || '?'};{' '}
                      {record.returnDate ? `вернули ${record.returnDate}` : 'ещё не вернули'};{' '}
                      {record.issuedByUser && `выдал: ${record.issuedByUser.username}`}
                      {record.acceptedByUser && `, принял: ${record.acceptedByUser.username}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Нет записей о выдаче.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- РЕЖИМ byCopy --- */}
      {searchMode === 'byCopy' && (
        <div className="by-copy-section">
          <h3>Поиск экземпляра по инвентарному номеру</h3>
          <div className="form-group">
            <input
              type="text"
              placeholder="Введите инвентарный номер"
              value={copyInvNumber}
              onChange={(e) => setCopyInvNumber(e.target.value)}
            />
            <button onClick={handleFindCopy}>Найти экземпляр</button>
          </div>

          {foundCopy && (
            <div className="copy-info">
              <h4>Найден экземпляр:</h4>
              <p>Инвентарный номер: {foundCopy.inventoryNumber}</p>
              {/* Если пришла связанная книга, можно её показать */}
              {foundCopy.book && (
                <p>
                  Книга: <strong>{foundCopy.book.title}</strong> / {foundCopy.book.author} (
                  {foundCopy.book.publishedYear})
                </p>
              )}
              {/* История выдач только для одного экземпляра */}
              <h5>История выдач этого экземпляра:</h5>
              {getCopyBorrowRecords().length > 0 ? (
                <ul>
                  {getCopyBorrowRecords().map((record) => (
                    <li key={record.id}>
                      <strong>Запись #{record.id}</strong>: выдан {record.borrowDate || '?'};{' '}
                      {record.returnDate ? `вернули ${record.returnDate}` : 'ещё не вернули'};{' '}
                      {record.issuedByUser && `выдал: ${record.issuedByUser.username}`}
                      {record.acceptedByUser && `, принял: ${record.acceptedByUser.username}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Нет записей о выдаче.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- Блок выбора студента (только при выдаче) --- */}
      {actionType === 'borrow' && (
        <div className="form-group">
          <label htmlFor="studentSelect">Студент, которому выдаём:</label>
          <select id="studentSelect" value={selectedStudentId || ''} onChange={handleStudentChange}>
            <option value="">-- выберите студента --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.lastName} {s.firstName}
                {s.middleName ? ` ${s.middleName}` : ''}{' '}
                {s.groupName ? `(${s.groupName})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* --- Кнопка "Выдать" или "Принять" --- */}
      <div className="form-group">
        {actionType === 'borrow' && (
          <button onClick={handleBorrow}>Выдать книгу (экземпляр)</button>
        )}
        {actionType === 'return' && (
          <button onClick={handleReturn}>Принять (возврат) экземпляра</button>
        )}
      </div>
    </div>
  );
};

export default BorrowReturn;