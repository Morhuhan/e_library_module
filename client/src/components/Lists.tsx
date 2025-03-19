import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpsClient.tsx';
import { BookCopy } from '../interfaces.ts';

const Lists: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [copies, setCopies] = useState<BookCopy[]>([]);

  // Функция загрузки экземпляров:
  const fetchCopies = async () => {
    try {
      // Запрашиваем /book-copies
      const response = await httpClient.get<BookCopy[]>('/book-copies');
      setCopies(response.data);
    } catch (error) {
      console.error('Ошибка при получении списка экземпляров:', error);
    }
  };

  useEffect(() => {
    fetchCopies();
  }, []);

  // Проверяем, доступен ли экземпляр (нет незакрытой записи borrowRecord)
  const isAvailable = (copy: BookCopy) => {
    if (!copy.borrowRecords || copy.borrowRecords.length === 0) {
      // Если нет записей — никогда не выдавался
      return true;
    }
    // Проверяем, нет ли записи с returnDate == null
    const hasOpenBorrow = copy.borrowRecords.some(
      (record) => record.returnDate === null
    );
    return !hasOpenBorrow;
  };

  // Фильтруем по названию книги + "только доступные"
  const filteredCopies = copies.filter((copy) => {
    const matchesTitle = copy.book.title
      .toLowerCase()
      .includes(searchValue.toLowerCase());
    const matchesAvailability = onlyAvailable ? isAvailable(copy) : true;
    return matchesTitle && matchesAvailability;
  });

  return (
    <div className="lists-container">
      <h2>Список экземпляров</h2>

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
            {/* Поля из таблицы Book */}
            <th>Название</th>
            <th>Автор</th>
            <th>Год</th>
            <th>ISBN</th>
            <th>Издательство</th>
            <th>Категория</th>
            <th>Страницы</th>
            <th>УДК</th>
            <th>ГРНТИ</th>

            {/* Поля из таблицы BookCopy */}
            <th>Инв. номер</th>
            <th>Дата поступления</th>
            <th>Дата списания</th>
            <th>Акт списания</th>
            <th>Цена</th>
            <th>Местоположение</th>

            {/* Статус */}
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {filteredCopies.length > 0 ? (
            filteredCopies.map((copy) => {
              const available = isAvailable(copy);
              return (
                <tr key={copy.id}>
                  {/* Данные книги */}
                  <td>{copy.book.title}</td>
                  <td>{copy.book.author}</td>
                  <td>{copy.book.publishedYear}</td>
                  <td>{copy.book.isbn || '—'}</td>
                  <td>{copy.book.publisher || '—'}</td>
                  <td>{copy.book.category || '—'}</td>
                  <td>{copy.book.pages ?? '—'}</td>
                  <td>{copy.book.udc || '—'}</td>
                  <td>{copy.book.grnti || '—'}</td>

                  {/* Данные экземпляра */}
                  <td>{copy.inventoryNumber}</td>
                  <td>{copy.acquisitionDate || '—'}</td>
                  <td>{copy.disposalDate || '—'}</td>
                  <td>{copy.disposalActNumber || '—'}</td>
                  <td>{copy.price != null ? copy.price : '—'}</td>
                  <td>{copy.location || '—'}</td>

                  {/* Статус (в наличии / выдана) */}
                  <td>{available ? 'В наличии' : 'Выдана'}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={16} className="no-books">
                Нет экземпляров, удовлетворяющих условиям поиска
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Lists;