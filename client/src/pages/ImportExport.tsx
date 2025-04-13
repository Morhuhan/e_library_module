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
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Импорт / Экспорт</h2>
      <div>
        <label style={{ marginRight: 8 }}>
          Сущность:
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value as EntityType)}
            style={{ marginLeft: 8 }}
          >
            <option value="books">Книги</option>
            <option value="copies">Экземпляры</option>
          </select>
        </label>
        <label style={{ marginRight: 8 }}>
          Режим:
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ModeType)}
            style={{ marginLeft: 8 }}
          >
            <option value="import">Импорт</option>
            <option value="export">Экспорт</option>
          </select>
        </label>
      </div>

      {mode === 'import' ? (
        <div style={{ marginTop: 16 }}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button onClick={handleImport} style={{ marginLeft: 8 }}>
            Загрузить
          </button>
          <button onClick={handleDownloadTemplate} style={{ marginLeft: 8 }}>
            Шаблон
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <label>
            Лимит (0 = все):
            <input
              type="number"
              min={0}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{ width: 80, marginLeft: 8 }}
            />
          </label>
          <button onClick={handleExport} style={{ marginLeft: 8 }}>
            Скачать
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportExport;