import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import httpClient from '../utils/httpsClient.tsx';

interface Librarian {
  id: number;
  username: string;
}

/**
 * Универсальная функция: из любого &laquo;похожего&raquo;
 * на массив ответа достаёт собственно массив пользователей.
 */
function pickArray(data: unknown): Librarian[] {
  if (Array.isArray(data)) return data;

  // самые частые структуры: {users:[...]}, {items:[...]}, {data:[...]}
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['users', 'items', 'data']) {
      if (Array.isArray(obj[key])) return obj[key] as Librarian[];
    }
  }

  return []; // ничего не подошло — возвращаем пустой массив
}

const ManageLibrarians: React.FC = () => {
  const [librarians, setLibrarians] = useState<Librarian[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  /** Загрузка списка библиотекарей */
  const fetchLibrarians = async () => {
    try {
      const res = await httpClient.get('/users', {
        params: { role: 'LIBRARIAN' },
      });

      setLibrarians(pickArray(res.data));
    } catch (err) {
      console.error('Ошибка получения библиотекарей:', err);
      toast.error('Не удалось загрузить список библиотекарей');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setLoading(true);

    try {
      await httpClient.post('/users/register', {
        username: newUsername,
        pass: newPassword,
      });
      toast.success('Библиотекарь создан');
      setNewUsername('');
      setNewPassword('');
      fetchLibrarians();
    } catch (err) {
      console.error('Ошибка создания библиотекаря:', err);
      toast.error('Не удалось создать библиотекаря');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить этого библиотекаря?')) return;
    try {
      await httpClient.delete(`/users/${id}`);
      toast.success('Библиотекарь удалён');
      setLibrarians(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Ошибка удаления:', err);
      toast.error('Не удалось удалить библиотекаря');
    }
  };

  const handleResetPassword = async (id: number) => {
    const newPass = prompt('Введите новый пароль');
    if (!newPass) return;
    try {
      await httpClient.patch(`/users/${id}/password`, { pass: newPass });
      toast.success('Пароль обновлён');
    } catch (err) {
      console.error('Ошибка сброса пароля:', err);
      toast.error('Не удалось обновить пароль');
    }
  };

  useEffect(() => {
    fetchLibrarians();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">
        Управление учетными записями библиотекарей
      </h1>

      {/* форма добавления */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded shadow p-4 mb-6 flex flex-col gap-3 max-w-md"
      >
        <h2 className="text-lg font-medium">Добавить библиотекаря</h2>

        <input
          value={newUsername}
          onChange={e => setNewUsername(e.target.value)}
          placeholder="Логин"
          required
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
        />

        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="Пароль"
          required
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 rounded"
        >
          {loading ? 'Создаём…' : 'Создать'}
        </button>
      </form>

      {/* таблица */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Логин</th>
              <th className="px-4 py-2 text-left">Действия</th>
            </tr>
          </thead>

          <tbody>
            {librarians.map(l => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2">{l.id}</td>
                <td className="px-4 py-2">{l.username}</td>
                <td className="px-4 py-2 space-x-2">
                  <button
                    onClick={() => handleResetPassword(l.id)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Сбросить пароль
                  </button>
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}

            {!librarians.length && (
              <tr>
                <td colSpan={3} className="text-center px-4 py-4">
                  Нет библиотекарей
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageLibrarians;