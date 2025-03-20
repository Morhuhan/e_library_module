import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpsClient.tsx';
import { BorrowRecord } from '../interfaces.tsx';

// Предполагаем, что бэкенд возвращает { data, total, page, limit }
interface PaginatedBorrowRecords {
  data: BorrowRecord[];
  total: number;
  page: number;
  limit: number;
}

const BorrowRecordsList: React.FC = () => {
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);

  const [searchValue, setSearchValue] = useState('');
  const [onlyDebts, setOnlyDebts] = useState(false);

  // Пагинация
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Функция загрузки записей с учётом пагинации, фильтра и поиска
  const fetchBorrowRecords = async (newPage = 1, newLimit = 10) => {
    try {
      // Предполагаем, что есть эндпоинт GET /borrow-records/paginated
      // который умеет принимать search, onlyDebts, page, limit
      const response = await httpClient.get<PaginatedBorrowRecords>(
        '/borrow-records/paginated',
        {
          params: {
            search: searchValue,
            onlyDebts: onlyDebts ? 'true' : 'false',
            page: newPage,
            limit: newLimit,
          },
        }
      );
      // Обновляем стейты
      setBorrowRecords(response.data.data);
      setTotal(response.data.total);
      setPage(response.data.page);
      setLimit(response.data.limit);
    } catch (error) {
      console.error('Ошибка при получении записей о выдаче:', error);
    }
  };

  // При изменении page/limit — подгружаем
  useEffect(() => {
    fetchBorrowRecords(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // При изменении поисковой строки / флажка "только невозвращённые" — сбрасываем страницу и грузим
  useEffect(() => {
    setPage(1);
    fetchBorrowRecords(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, onlyDebts]);

  // Вычисляем общее число страниц
  const totalPages = Math.ceil(total / limit);

  // Вспомогательная функция
  const isReturned = (record: BorrowRecord) => record.returnDate !== null;

  return (
    <div className="borrow-records-container">
      <h2>Записи о выдаче книг (пагинация)</h2>

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

      {/* Таблица записей */}
      <table className="borrow-records-table">
        <thead>
          <tr>
            <th>ID записи</th>
            <th>Название (Book.title)</th>
            <th>Экземпляр (BookCopy.copyInfo)</th>
            <th>Получатель (Person)</th>
            <th>Дата выдачи</th>
            <th>Дата возврата</th>
            <th>Кто выдал</th>
            <th>Кто принял</th>
          </tr>
        </thead>
        <tbody>
          {borrowRecords.length > 0 ? (
            borrowRecords.map((record) => {
              const bookTitle = record.bookCopy?.book?.title || '—';
              const copyInfo =
                record.bookCopy?.copyInfo || `Экз. #${record.bookCopy?.id}`;

              // Person
              const person = record.person
                ? `${record.person.lastName} ${record.person.firstName}${
                    record.person.middleName ? ` ${record.person.middleName}` : ''
                  }`
                : '—';

              const issuedUser =
                record.issuedByUser?.username ||
                `ID ${record.issuedByUser?.id || '—'}`;
              const acceptedUser =
                record.acceptedByUser?.username ||
                `ID ${record.acceptedByUser?.id || '—'}`;

              return (
                <tr key={record.id}>
                  <td>{record.id}</td>
                  <td>{bookTitle}</td>
                  <td>{copyInfo}</td>
                  <td>{person}</td>
                  <td>{record.borrowDate || '—'}</td>
                  <td>{record.returnDate || '—'}</td>
                  <td>{issuedUser}</td>
                  <td>{isReturned(record) ? acceptedUser : '—'}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={8} className="no-records">
                Нет записей, удовлетворяющих условиям поиска
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Пагинация */}
      <div className="pagination-controls">
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page <= 1}
        >
          &laquo; Предыдущая
        </button>
        <span style={{ margin: '0 8px' }}>
          Страница {page} из {totalPages || 1}
        </span>
        <button
          onClick={() =>
            setPage((prev) => (prev < totalPages ? prev + 1 : prev))
          }
          disabled={page >= totalPages || totalPages === 0}
        >
          Следующая &raquo;
        </button>
        <select
          value={limit}
          onChange={(e) => {
            const newLimit = parseInt(e.target.value, 10) || 10;
            setLimit(newLimit);
            setPage(1);
          }}
        >
          <option value="5">5 на странице</option>
          <option value="10">10 на странице</option>
          <option value="20">20 на странице</option>
        </select>
      </div>
    </div>
  );
};

export default BorrowRecordsList;