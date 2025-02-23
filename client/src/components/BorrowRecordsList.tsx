import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpClient.tsx';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  groupName?: string | null;
}

interface User {
  id: number;
  // Можно дополнить полями, если нужно
}

interface Book {
  id: number;
  title: string;
  author: string;
  publishedYear: number;
  isbn?: string;
  localNumber?: string;
}

interface BorrowRecord {
  id: number;
  book: Book;
  student: Student;
  issuedByUser: User;
  acceptedByUser: User | null;
  borrowDate: string | null;
  returnDate: string | null;
}

const BorrowRecordsList: React.FC = () => {
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [onlyDebts, setOnlyDebts] = useState(false);

  // Загружаем все записи о выдаче
  const fetchBorrowRecords = async () => {
    try {
      const response = await httpClient.get<BorrowRecord[]>('/borrow-records');
      setBorrowRecords(response.data);
    } catch (error) {
      console.error('Ошибка при получении списка записей о выдаче:', error);
    }
  };

  useEffect(() => {
    fetchBorrowRecords();
  }, []);

  // Обработчик изменения значения поля поиска
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  // Проверяем, возвращена ли книга (есть ли returnDate)
  const isReturned = (record: BorrowRecord) => {
    return record.returnDate != null;
  };

  // Фильтруем записи
  const filteredRecords = borrowRecords.filter((record) => {
    // Фильтр по фамилии (или части фамилии) студента
    const studentLastName = record.student.lastName.toLowerCase();
    const matchesStudentName = studentLastName.includes(searchValue.toLowerCase());

    // Фильтр "только долги" (нет returnDate)
    const matchesDebtFilter = onlyDebts ? !isReturned(record) : true;

    return matchesStudentName && matchesDebtFilter;
  });

  return (
    <div className="borrow-records-container">
      <h2>Записи о выдаче книг</h2>

      <div className="search-container">
        <input
          type="text"
          placeholder="Поиск по фамилии студента..."
          value={searchValue}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>

      <div className="checkbox-container">
        <label>
          <input
            type="checkbox"
            checked={onlyDebts}
            onChange={(e) => setOnlyDebts(e.target.checked)}
          />
          Показать только долги (не возвращенные)
        </label>
      </div>

      <table className="borrow-records-table">
        <thead>
          <tr>
            <th>ID записи</th>
            <th>Книга</th>
            <th>Студент</th>
            <th>Дата выдачи</th>
            <th>Дата возврата</th>
            <th>Выдал (ID пользователя)</th>
            <th>Принял (ID пользователя)</th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record) => (
              <tr key={record.id}>
                <td>{record.id}</td>
                <td>{record.book.title}</td>
                <td>
                  {record.student.lastName} {record.student.firstName}
                  {record.student.groupName && ` (${record.student.groupName})`}
                </td>
                <td>{record.borrowDate || '—'}</td>
                <td>{record.returnDate || '—'}</td>
                <td>{record.issuedByUser?.id || '—'}</td>
                <td>{record.acceptedByUser?.id || '—'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="no-records">
                Нет записей, удовлетворяющих условиям поиска
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BorrowRecordsList;