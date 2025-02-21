// src/components/Lists.tsx

import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpClient.tsx';

interface BorrowRecord {
  id: number;
  borrowDate: string | null;
  returnDate: string | null;
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

const Lists: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);

  // Загружаем список книг
  const fetchBooks = async () => {
    try {
      const response = await httpClient.get<Book[]>('/books');
      console.log(response.data);
      setBooks(response.data);
    } catch (error) {
      console.error('Ошибка при получении списка книг:', error);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Обработка поиска по названию
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  // Определяем, доступна ли книга (нет активных записей о выдаче)
  const isBookAvailable = (book: Book) => {
    if (!book.borrowRecords) return true;
    return !book.borrowRecords.some((record) => !record.returnDate);
  };

  // Применяем фильтры: по названию и &laquo;только в наличии&raquo;
  const filteredBooks = books.filter((book) => {
    const matchesTitle = book.title
      .toLowerCase()
      .includes(searchValue.toLowerCase());
    const matchesAvailability = onlyAvailable ? isBookAvailable(book) : true;
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
          onChange={handleSearchChange}
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
          Показать только в наличии
        </label>
      </div>

      <table className="books-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Автор</th>
            <th>Год</th>
            <th>Локальный номер</th>
            <th>ISBN</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {filteredBooks.length > 0 ? (
            filteredBooks.map((book) => (
              <tr key={book.id}>
                <td>{book.title}</td>
                <td>{book.author}</td>
                <td>{book.publishedYear}</td>
                <td>{book.localNumber || '—'}</td>
                <td>{book.isbn || '—'}</td>
                <td>{isBookAvailable(book) ? 'В наличии' : 'Выдана'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="no-books">
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