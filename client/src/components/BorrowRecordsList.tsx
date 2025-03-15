import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpClient.tsx';
import { BorrowRecord } from '../interfaces.ts';

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

  // Проверяем, возвращена ли книга (returnDate != null)
  const isReturned = (record: BorrowRecord) => {
    return record.returnDate !== null;
  };

  // Фильтр по фамилии (части фамилии) + только долги
  const filteredRecords = borrowRecords.filter((record) => {
    // может случиться, что record.student = undefined;
    // в таком случае подстрахуемся
    const lastName = record.student?.lastName?.toLowerCase() || '';
    const matchesStudentName = lastName.includes(searchValue.toLowerCase());
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
          onChange={(e) => setSearchValue(e.target.value)}
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
          Показать только не возвращённые
        </label>
      </div>

      <table className="borrow-records-table">
        <thead>
          <tr>
            <th>ID записи</th>
            <th>Название книги</th>
            <th>Инв. номер</th>
            <th>Студент</th>
            <th>Дата выдачи</th>
            <th>Дата возврата</th>
            <th>Кто выдал</th>
            <th>Кто принял</th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record) => (
              <tr key={record.id}>
                <td>{record.id}</td>
                <td>{record.bookCopy.book.title}</td>
                <td>{record.bookCopy.inventoryNumber}</td>
                <td>
                  {record.student
                    ? `${record.student.lastName} ${record.student.firstName}${
                        record.student.groupName ? ` (${record.student.groupName})` : ''
                      }`
                    : '—'}
                </td>
                <td>{record.borrowDate || '—'}</td>
                <td>{record.returnDate || '—'}</td>
                <td>
                  {record.issuedByUser?.username
                    ? record.issuedByUser.username
                    : record.issuedByUser?.id || '—'}
                </td>
                <td>
                  {record.acceptedByUser?.username
                    ? record.acceptedByUser.username
                    : record.acceptedByUser?.id || '—'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="no-records">
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