import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpsClient.tsx';
import type { BorrowRecord, PaginatedResponse } from '../utils/interfaces.tsx';
import Pagination from '../components/Pagination.tsx';

const BorrowRecordsList: React.FC = () => {
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [onlyDebts, setOnlyDebts] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchBorrowRecords = async (newPage = 1, newLimit = 10) => {
    try {
      const res = await httpClient.get<PaginatedResponse<BorrowRecord>>(
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
      setBorrowRecords(res.data.data);
      setTotal(res.data.total);
      setPage(res.data.page);
      setLimit(res.data.limit);
    } catch (err) {
      console.error('Ошибка при получении записей:', err);
    }
  };

  useEffect(() => {
    fetchBorrowRecords(page, limit);
  }, [page, limit]);

  useEffect(() => {
    setPage(1);
    fetchBorrowRecords(1, limit);
  }, [searchValue, onlyDebts]);

  const totalPages = Math.ceil(total / limit);

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

      <table className="borrow-records-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Экземпляр</th>
            <th>Получатель</th>
            <th>Дата выдачи</th>
            <th>Дата возврата</th>
            <th>Кто выдал</th>
            <th>Кто принял</th>
          </tr>
        </thead>
        <tbody>
          {borrowRecords.length > 0 ? (
            borrowRecords.map((rec) => {
              const bookTitle = rec.bookCopy?.book?.title || '—';
              const copyInfo = rec.bookCopy?.copyInfo || `Экз. #${rec.bookCopy?.id}`;
              const person = rec.person
                ? `${rec.person.lastName} ${rec.person.firstName}${
                    rec.person.middleName ? ` ${rec.person.middleName}` : ''
                  }`
                : '—';
              const issuedUser =
                rec.issuedByUser?.username || `ID ${rec.issuedByUser?.id || '—'}`;
              const acceptedUser =
                rec.acceptedByUser?.username || `ID ${rec.acceptedByUser?.id || '—'}`;
              const isReturned = rec.returnDate !== null;

              return (
                <tr key={rec.id}>
                  <td>{rec.id}</td>
                  <td>{bookTitle}</td>
                  <td>{copyInfo}</td>
                  <td>{person}</td>
                  <td>{rec.borrowDate || '—'}</td>
                  <td>{rec.returnDate || '—'}</td>
                  <td>{issuedUser}</td>
                  <td>{isReturned ? acceptedUser : '—'}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={8} className="no-records">
                Нет записей
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      />
    </div>
  );
};

export default BorrowRecordsList;