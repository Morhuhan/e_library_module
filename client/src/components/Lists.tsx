import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpsClient.tsx'; 
import { Book } from '../interfaces';

interface PaginatedBooks {
  data: Book[];
  total: number;
  page: number;
  limit: number;
}

const Lists: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Пагинация
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Список книг
  const [books, setBooks] = useState<Book[]>([]);

// Функция загрузки книг (с учётом пагинации и фильтров)
const fetchBooks = async (newPage = 1, newLimit = 10) => {
  try {
    const resp = await httpClient.get<PaginatedBooks>('/books/paginated', {
      params: {
        search: searchValue,
        onlyAvailable: onlyAvailable ? 'true' : 'false',
        page: String(newPage), 
        limit: String(newLimit),
      },
    });
    setBooks(resp.data.data);
    setTotal(resp.data.total);

    setLimit(resp.data.limit);
  } catch (error) {
    console.error('Ошибка при загрузке списка книг:', error);
  }
};

  // Когда меняются page / limit, делаем запрос
  useEffect(() => {
    fetchBooks(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // Когда меняются searchValue / onlyAvailable, сбрасываем на 1-ю страницу и делаем запрос
  useEffect(() => {
    setPage(1);
    fetchBooks(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, onlyAvailable]);

  const totalPages = Math.ceil(total / limit);

  // Определяем, "доступна" ли книга (есть ли хотя бы один экземпляр без открытой выдачи)
  const isBookAvailable = (book: Book) => {
    if (!book.bookCopies || book.bookCopies.length === 0) {
      return false; // нет экземпляров
    }
    // хотя бы один экземпляр "доступен", если в нём нет BorrowRecord с returnDate=null
    return book.bookCopies.some(copy => {
      if (!copy.borrowRecords || copy.borrowRecords.length === 0) {
        return true;
      }
      return !copy.borrowRecords.some(r => r.returnDate === null);
    });
  };

  return (
    <div>
      <h2>Список книг (пагинация)</h2>

      <div>
        <input
          type="text"
          placeholder="Поиск по названию книги..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={e => setOnlyAvailable(e.target.checked)}
          />
          Показать только книги, где есть доступные экземпляры
        </label>
      </div>

      {/* Таблица со списком книг */}
      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Тип</th>
            <th>Редакция</th>
            <th>Изд. заявление</th>
            <th>Инф. о публиковании</th>
            <th>Физ. описание</th>
            <th>Серия</th>
            <th>УДК</th>
            <th>ББК</th>
            <th>Лок. индекс</th>
            <th>Авторы</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {books.length > 0 ? (
            books.map(book => {
              const available = isBookAvailable(book);
              return (
                <tr key={book.id}>
                  <td>{book.title || '—'}</td>
                  <td>{book.bookType || '—'}</td>
                  <td>{book.edit || '—'}</td>
                  <td>{book.editionStatement || '—'}</td>
                  <td>{book.pubInfo || '—'}</td>
                  <td>{book.physDesc || '—'}</td>
                  <td>{book.series || '—'}</td>
                  <td>{book.udc || '—'}</td>
                  <td>{book.bbk || '—'}</td>
                  <td>{book.localIndex || '—'}</td>
                  <td>{book.authors || '—'}</td>
                  <td>
                    {available ? 'Есть доступные экземпляры' : 'Нет в наличии'}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={12}>Нет книг, удовлетворяющих условиям</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Пагинация */}
      <div>
        <button
          onClick={() => setPage(prev => Math.max(prev - 1, 1))}
          disabled={page <= 1}
        >
          Предыдущая
        </button>
        <span>
          Страница {page} из {totalPages || 1}
        </span>
        <button
          onClick={() => setPage(prev => (prev < totalPages ? prev + 1 : prev))}
          disabled={page >= totalPages || totalPages === 0}
        >
          Следующая
        </button>
        <select
          value={limit}
          onChange={e => {
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

export default Lists;