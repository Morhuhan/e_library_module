import React, { useState } from 'react';
import httpClient from '../utils/httpsClient.tsx';
import * as FileSaver from 'file-saver';
import { toast } from 'react-toastify';

type EntityType = 'books' | 'copies';
type ModeType = 'import' | 'export';

const ImportExport: React.FC = () => {
  const [entity, setEntity] = useState<EntityType>('books');
  const [mode, setMode] = useState<ModeType>('import');
  const [file, setFile] = useState<File | null>(null);
  const [limit, setLimit] = useState(0);

  const handleImport = async () => {
    if (!file) {
      alert('Выберите Excel-файл');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const url = `/import-export/${entity}`;
      const res = await httpClient.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Импорт выполнен. Ответ сервера: ${JSON.stringify(res.data)}`);
    } catch (err) {
      console.error('Ошибка импорта:', err);
      toast.error('Не удалось выполнить импорт');
    }
  };

  const handleExport = async () => {
    try {
      const url = `/import-export/${entity}?limit=${limit}`;
      const res = await httpClient.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const fileName = `${entity}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      FileSaver.saveAs(blob, fileName);
      toast.success(`Экспорт выполнен: ${fileName}`);
    } catch (err) {
      console.error('Ошибка экспорта:', err);
      toast.error('Не удалось выполнить экспорт');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const url = `/import-export/${entity}/template`;
      const res = await httpClient.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      FileSaver.saveAs(blob, `${entity}-template.xlsx`);
      toast.success('Шаблон загружен');
    } catch (err) {
      console.error('Ошибка при загрузке шаблона:', err);
      toast.error('Не удалось загрузить шаблон');
    }
  };

  return (
    <div className="w-full max-w-full px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Импорт / Экспорт</h2>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-sm font-medium">
          Сущность:
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value as EntityType)}
            className="ml-2 border border-gray-300 rounded px-7 py-1 text-sm focus:outline-none"
          >
            <option value="books">Книги</option>
            <option value="copies">Экземпляры</option>
          </select>
        </label>

        <label className="text-sm font-medium">
          Режим:
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ModeType)}
            className="ml-2 border border-gray-300 rounded px-7 py-1 text-sm focus:outline-none"
          >
            <option value="import">Импорт</option>
            <option value="export">Экспорт</option>
          </select>
        </label>
      </div>

      {mode === 'import' ? (
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <div className="space-x-2">
            <button
              onClick={handleImport}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-1 px-3 rounded"
            >
              Загрузить
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium py-1 px-3 rounded"
            >
              Шаблон
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Лимит (0 = все):
            <input
              type="number"
              min={0}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="ml-2 w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
            />
          </label>
          <button
            onClick={handleExport}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-1 px-3 rounded w-fit"
          >
            Скачать
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportExport;