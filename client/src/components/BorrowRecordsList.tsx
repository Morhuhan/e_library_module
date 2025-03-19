import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpsClient.tsx';
import { BorrowRecord } from '../interfaces.tsx';

const BorrowRecordsList: React.FC = () => {
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [onlyDebts, setOnlyDebts] = useState(false);

  // Загружаем все записи
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

  // Проверяем, возвращена ли книга
  const isReturned = (record: BorrowRecord) => {
    return record.returnDate !== null;
  };

  // Фильтрация по фамилии + проверка только невозвращённых
  const filteredRecords = borrowRecords.filter((record) => {
    // Учитываем, что record.person может быть undefined или null
    const lastName = record.person?.lastName?.toLowerCase() || '';
    const matchesNameFilter = lastName.includes(searchValue.toLowerCase());
    const matchesDebtFilter = onlyDebts ? !isReturned(record) : true;

    return matchesNameFilter && matchesDebtFilter;
  });

  return (
    <div className="borrow-records-container">
      <h2>Записи о выдаче книг</h2>

      <div className="search-container">
        <input
          type="text"
          placeholder="Поиск по фамилии..."
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
            <th>Получатель</th>
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
                  {record.person
                    ? `${record.person.lastName} ${record.person.firstName}${
                        record.person.middleName ? ` ${record.person.middleName}` : ''
                      }`
                    : '—'}
                  {/* 
                      Если у Person есть groupName и вы хотите выводить, 
                      можете добавить:
                      record.person.groupName ? ` (${record.person.groupName})` : ''
                  */}
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