// src/components/Reports.tsx

import React, { useState } from 'react';
import httpClient from '../utils/httpsClient.tsx';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // Универсальная функция для формирования и сохранения Excel из массива объектов
  const exportToExcel = (jsonData: any[], sheetName: string, fileName: string) => {
    // 1. Преобразуем JSON в worksheet
    const worksheet = XLSX.utils.json_to_sheet(jsonData);
    // 2. Создаём новую книгу (workbook)
    const workbook = XLSX.utils.book_new();
    // 3. Добавляем лист в книгу
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    // 4. Генерируем buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    // 5. Сохраняем файл
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), fileName);
  };

  // Обработчики для разных отчётов
  const handleUnreturned = async () => {
    setLoading(true);
    try {
      const response = await httpClient.get('/reports/unreturned');
      exportToExcel(response.data, 'Unreturned', 'unreturned.xlsx');
    } catch (error) {
      console.error(error);
      alert('Ошибка при получении невозвращенных книг');
    } finally {
      setLoading(false);
    }
  };

  const handleOverdue = async () => {
    setLoading(true);
    try {
      const response = await httpClient.get('/reports/overdue');
      exportToExcel(response.data, 'Overdue', 'overdue.xlsx');
    } catch (error) {
      console.error(error);
      alert('Ошибка при получении просроченных книг');
    } finally {
      setLoading(false);
    }
  };

  const handlePopular = async () => {
    setLoading(true);
    try {
      const response = await httpClient.get('/reports/popular');
      exportToExcel(response.data, 'Popular', 'popular.xlsx');
    } catch (error) {
      console.error(error);
      alert('Ошибка при получении популярных книг');
    } finally {
      setLoading(false);
    }
  };

  const handleActiveReaders = async () => {
    setLoading(true);
    try {
      const response = await httpClient.get('/reports/active-readers');
      exportToExcel(response.data, 'ActiveReaders', 'active_readers.xlsx');
    } catch (error) {
      console.error(error);
      alert('Ошибка при получении самых активных читателей');
    } finally {
      setLoading(false);
    }
  };

  const handleBooksWithoutCopies = async () => {
    setLoading(true);
    try {
      const resp = await httpClient.get('/reports/no-copies');
      const mapped = resp.data.map((r: any) => ({
        'ID книги'          : r.id,
        'Название'          : r.bookTitle,
        'Всего экземпляров' : r.copiesCount,
        'Сейчас выдано'     : r.borrowedNow,
        'Причина отсутствия': r.reason,
      }));
      exportToExcel(mapped, 'NoCopies', 'no_copies.xlsx');
    } catch (e) {
      console.error(e);
      alert('Ошибка при получении книг без экземпляров');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Отчёты</h2>

      <div style={{ marginBottom: '1rem' }}>
        <button onClick={handleUnreturned} disabled={loading}>
          Невозвращенные
        </button>
        <button onClick={handleOverdue} disabled={loading} style={{ marginLeft: 8 }}>
          Просроченные
        </button>
        <button onClick={handlePopular} disabled={loading} style={{ marginLeft: 8 }}>
          Популярные (топ-10)
        </button>
        <button onClick={handleActiveReaders} disabled={loading} style={{ marginLeft: 8 }}>
          Активные читатели (топ-10)
        </button>
        <button onClick={handleBooksWithoutCopies} disabled={loading} style={{ marginLeft: 8 }}>
          Книги без экземпляров
        </button>
      </div>

      {loading && <p>Загрузка...</p>}
    </div>
  );
};

export default Reports;