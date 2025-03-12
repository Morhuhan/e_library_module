import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpClient.tsx';

interface BorrowRecord {
  id: number;
  borrowDate: string | null;
  returnDate: string | null;
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
  // localNumber?: string; // Если вы больше не храните localNumber в Book, уберите
  bookCopies?: BookCopy[];
}

const Lists: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);

  // Загружаем список книг (каждая книга содержит массив bookCopies)
  const fetchBooks = async () => {
    try {
      const response = await httpClient.get<Book[]>('/books');
      setBooks(response.data);
    } catch (error) {
      console.error('Ошибка при получении списка книг:', error);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Проверяем, доступна ли хотя бы одна копия
  const hasAvailableCopy = (book: Book) => {
    if (!book.bookCopies || book.bookCopies.length === 0) {
      return false; // Нет экземпляров, значит 0 в наличии
    }
    // Если у хотя бы одного экземпляра НЕТ активного borrowRecord (без returnDate), значит он доступен
    return book.bookCopies.some((copy) => {
      // Нет записей — значит никогда не выдавали, следовательно, доступна
      if (!copy.borrowRecords || copy.borrowRecords.length === 0) {
        return true;
      }
      // Проверяем, есть ли незакрытая выдача (returnDate == null)
      const isCurrentlyBorrowed = copy.borrowRecords.some(
        (record) => !record.returnDate
      );
      return !isCurrentlyBorrowed; // если ни одной незакрытой выдачи нет, копия доступна
    });
  };

  // Фильтр по названию + флаг &laquo;только доступные&raquo;
  const filteredBooks = books.filter((book) => {
    const matchesTitle = book.title
      .toLowerCase()
      .includes(searchValue.toLowerCase());
    const matchesAvailability = onlyAvailable ? hasAvailableCopy(book) : true;
    return matchesTitle && matchesAvailability;
  });

  return (
    <div className="lists-container">
      <h2>Список книг</h2>

      <div className="search-container">
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="checkbox-container">
        <label>
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
          />
          Показать только доступные
        </label>
      </div>

      <table className="books-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Автор</th>
            <th>Год</th>
            <th>ISBN</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {filteredBooks.length > 0 ? (
            filteredBooks.map((book) => {
              const available = hasAvailableCopy(book);
              return (
                <tr key={book.id}>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.publishedYear}</td>
                  <td>{book.isbn || '—'}</td>
                  <td>{available ? 'Есть доступные экземпляры' : 'Все выданы'}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="no-books">
                Нет книг, удовлетворяющих условиям поиска
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Lists;