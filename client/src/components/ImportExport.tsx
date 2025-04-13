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

  // ===== Импорт
  const handleImport = async () => {
    if (!file) {
      toast.error('Выберите Excel-файл');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log(`Импорт (entity=${entity}), файл: ${file.name}`);
      const url = `/import-export/${entity}`;
      const resp = await httpClient.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Ответ сервера при импорте:', resp.data);
      toast.success(`Импорт выполнен. ${JSON.stringify(resp.data)}`);
    } catch (error: any) {
      console.error('Ошибка при импорте:', error);
      toast.error(error.response?.data?.message || 'Ошибка импорта');
    }
  };

  // ===== Экспорт
  const handleExport = async () => {
    try {
      console.log(`Экспорт (entity=${entity}), limit=${limit}`);
      const url = `/import-export/${entity}?limit=${limit}`;
      const response = await httpClient.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
      });
      console.log('Успешно получили XLSX (байт):', response.data.byteLength);

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const fileName = `${entity}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      FileSaver.saveAs(blob, fileName);

      toast.success(`Экспорт успешно выполнен (${fileName})`);
    } catch (error: any) {
      console.error('Ошибка при экспорте:', error);
      toast.error(error.response?.data?.message || 'Ошибка экспорта');
    }
  };

  // ===== Скачать шаблон
  const handleDownloadTemplate = async () => {
    try {
      // В зависимости от выбранного entity — books или copies.
      const url = `/import-export/${entity}/template`;
      const response = await httpClient.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
      });
      console.log('Шаблон XLSX (байт):', response.data.byteLength);

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      FileSaver.saveAs(blob, `${entity}-template.xlsx`);

      toast.success('Шаблон успешно загружен');
    } catch (error: any) {
      console.error('Ошибка при загрузке шаблона:', error);
      toast.error('Ошибка при загрузке шаблона');
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
        <>
          <div style={{ marginTop: 16 }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button onClick={handleImport} style={{ marginLeft: 8 }}>
              Загрузить
            </button>
            <button onClick={handleDownloadTemplate} style={{ marginLeft: 8 }}>
              Скачать шаблон
            </button>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default ImportExport;