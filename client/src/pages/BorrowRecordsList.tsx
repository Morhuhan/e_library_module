import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpsClient.tsx';
import type { BorrowRecord, PaginatedResponse } from '../utils/interfaces.tsx';
import Pagination from '../components/Pagination.tsx';
import { toast } from 'react-toastify';

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

  const handleCellClick = (e: React.MouseEvent<HTMLTableCellElement>) => {
    const text = e.currentTarget.textContent?.trim() || '';

    if (navigator && 'clipboard' in navigator) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          toast.success(`Скопировано: "${text}"`);
        })
        .catch((err) => {
          console.error('Ошибка при копировании текста (clipboard): ', err);
        });
    } else {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success(`Скопировано: "${text}"`);
      } catch (copyErr) {
        console.error('Ошибка при копировании текста (execCommand): ', copyErr);
      }
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
    <div className="container mx-auto px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Записи о выдаче книг (пагинация)</h2>

      <div className="mb-2 flex flex-col sm:flex-row items-center gap-2">
        <input
          type="text"
          placeholder="Поиск по фамилии..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 focus:outline-none text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyDebts}
            onChange={(e) => setOnlyDebts(e.target.checked)}
          />
          Показать только не возвращённые
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="table-fixed w-full text-sm border-collapse border-2 border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border-2 border-gray-400 w-16 break-words whitespace-normal">
                ID
              </th>
              <th className="p-2 border-2 border-gray-400 w-48 break-words whitespace-normal">
                Название
              </th>
              <th className="p-2 border-2 border-gray-400 w-36 break-words whitespace-normal">
                Экземпляр
              </th>
              <th className="p-2 border-2 border-gray-400 w-48 break-words whitespace-normal">
                Получатель
              </th>
              <th className="p-2 border-2 border-gray-400 w-28 break-words whitespace-normal">
                Дата выдачи
              </th>
              <th className="p-2 border-2 border-gray-400 w-28 break-words whitespace-normal">
                Дата возврата
              </th>
              <th className="p-2 border-2 border-gray-400 w-32 break-words whitespace-normal">
                Кто выдал
              </th>
              <th className="p-2 border-2 border-gray-400 w-32 break-words whitespace-normal">
                Кто принял
              </th>
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
                  <tr key={rec.id} className="group border-b hover:bg-gray-200 transition-colors">
                    <td
                      className="p-2 border break-words whitespace-normal cursor-pointer
                                 group-hover:bg-gray-200 hover:!bg-yellow-2000 transition-colors"
                      onClick={handleCellClick}
                    >
                      {rec.id}
                    </td>
                    <td
                      className="p-2 border break-words whitespace-normal cursor-pointer
                                 group-hover:bg-gray-200 hover:!bg-yellow-2000 transition-colors"
                      onClick={handleCellClick}
                    >
                      {bookTitle}
                    </td>
                    <td
                      className="p-2 border break-words whitespace-normal cursor-pointer
                                 group-hover:bg-gray-200 hover:!bg-yellow-2000 transition-colors"
                      onClick={handleCellClick}
                    >
                      {copyInfo}
                    </td>
                    <td
                      className="p-2 border break-words whitespace-normal cursor-pointer
                                 group-hover:bg-gray-200 hover:!bg-yellow-2000 transition-colors"
                      onClick={handleCellClick}
                    >
                      {person}
                    </td>
                    <td
                      className="p-2 border break-words whitespace-normal cursor-pointer
                                 group-hover:bg-gray-200 hover:!bg-yellow-2000 transition-colors"
                      onClick={handleCellClick}
                    >
                      {rec.borrowDate || '—'}
                    </td>
                    <td
                      className="p-2 border break-words whitespace-normal cursor-pointer
                                 group-hover:bg-gray-200 hover:!bg-yellow-2000 transition-colors"
                      onClick={handleCellClick}
                    >
                      {rec.returnDate || '—'}
                    </td>
                    <td
                      className="p-2 border break-words whitespace-normal cursor-pointer
                                 group-hover:bg-gray-200 hover:!bg-yellow-2000 transition-colors"
                      onClick={handleCellClick}
                    >
                      {issuedUser}
                    </td>
                    <td
                      className="p-2 border break-words whitespace-normal cursor-pointer
                                 group-hover:bg-gray-200 hover:!bg-yellow-2000 transition-colors"
                      onClick={handleCellClick}
                    >
                      {isReturned ? acceptedUser : '—'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="p-2 border text-center">
                  Нет записей
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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