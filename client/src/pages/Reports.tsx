import React, { useState } from 'react';
import httpClient from '../utils/httpsClient.tsx';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const exportToExcel = (jsonData: any[], sheetName: string, fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(jsonData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), fileName);
  };

  const handleUnreturned = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/reports/unreturned');
      exportToExcel(res.data, 'Unreturned', 'unreturned.xlsx');
      toast.success('Отчёт "Невозвращенные" сформирован');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOverdue = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/reports/overdue');
      exportToExcel(res.data, 'Overdue', 'overdue.xlsx');
      toast.success('Отчёт "Просроченные" сформирован');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePopular = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/reports/popular');
      exportToExcel(res.data, 'Popular', 'popular.xlsx');
      toast.success('Отчёт "Популярные" сформирован');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleActiveReaders = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/reports/active-readers');
      exportToExcel(res.data, 'ActiveReaders', 'active_readers.xlsx');
      toast.success('Отчёт "Активные читатели" сформирован');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBooksWithoutCopies = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get('/reports/no-copies');
      const mapped = res.data.map((r: any) => ({
        'ID книги': r.id,
        'Название': r.bookTitle,
        'Всего экз.': r.copiesCount,
        'Выдано сейчас': r.borrowedNow,
        'Причина': r.reason,
      }));
      exportToExcel(mapped, 'NoCopies', 'no_copies.xlsx');
      toast.success('Отчёт "Без экземпляров" сформирован');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Отчёты</h2>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleUnreturned}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded disabled:opacity-50"
        >
          Невозвращенные
        </button>
        <button
          onClick={handleOverdue}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded disabled:opacity-50"
        >
          Просроченные
        </button>
        <button
          onClick={handlePopular}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded disabled:opacity-50"
        >
          Популярные
        </button>
        <button
          onClick={handleActiveReaders}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded disabled:opacity-50"
        >
          Активные читатели
        </button>
        <button
          onClick={handleBooksWithoutCopies}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded disabled:opacity-50"
        >
          Без экземпляров
        </button>
      </div>
      {loading && <p className="mt-4 text-sm">Загрузка...</p>}
    </div>
  );
};

export default Reports;