import React, { useState, useEffect } from 'react';
import httpClient from '../utils/httpsClient.tsx';
import type { Book, BookCopy, PaginatedResponse } from '../utils/interfaces.tsx';
import Pagination from '../components/Pagination.tsx';

const Lists: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [expandedBookIds, setExpandedBookIds] = useState<number[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBookForEdit, setSelectedBookForEdit] = useState<Book | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBookForDelete, setSelectedBookForDelete] = useState<Book | null>(null);

  const fetchBooks = async (newPage = 1, newLimit = 10) => {
    try {
      const res = await httpClient.get<PaginatedResponse<Book>>('/books/paginated', {
        params: {
          search: searchValue,
          onlyAvailable: onlyAvailable ? 'true' : 'false',
          page: String(newPage),
          limit: String(newLimit),
        },
      });
      setBooks(res.data.data);
      setTotal(res.data.total);
      setLimit(res.data.limit);
      setPage(res.data.page);
    } catch (err) {
      console.error('Ошибка при загрузке книг:', err);
    }
  };

  useEffect(() => {
    fetchBooks(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  useEffect(() => {
    setPage(1);
    fetchBooks(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, onlyAvailable]);

  const totalPages = Math.ceil(total / limit);

  const isBookAvailable = (book: Book) => {
    return book.bookCopies?.some((c) => !c.borrowRecords?.some((r) => !r.returnDate)) || false;
  };

  const toggleExpandBook = (bookId: number) => {
    setExpandedBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  const openEditModal = (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBookForEdit(book);
    setEditTitle(book.title || '');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedBookForEdit(null);
    setEditTitle('');
  };

  const handleEditSave = async () => {
    if (!selectedBookForEdit) return;
    try {
      await httpClient.put(`/books/${selectedBookForEdit.id}`, { title: editTitle });
      await fetchBooks(page, limit);
      closeEditModal();
    } catch (err) {
      console.error('Ошибка при сохранении изменений:', err);
      closeEditModal();
    }
  };

  const openDeleteModal = (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBookForDelete(book);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setSelectedBookForDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedBookForDelete) return;
    try {
      await httpClient.delete(`/books/${selectedBookForDelete.id}`);
      await fetchBooks(page, limit);
      closeDeleteModal();
    } catch (err) {
      console.error('Ошибка при удалении книги:', err);
      closeDeleteModal();
    }
  };

  const getCopyStatus = (copy: BookCopy) => {
    const active = copy.borrowRecords?.find((r) => !r.returnDate);
    return active ? `Выдан (с ${active.borrowDate || '—'})` : 'В наличии';
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Список книг (пагинация)</h2>

      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Поиск..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
          />
          Только доступные
        </label>
      </div>

      <div className="overflow-x-auto">
      <table className="table-fixed w-full text-sm border-collapse border-2 border-gray-400">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border-2 border-gray-400 w-40 break-words whitespace-normal">
                Название
              </th>
              <th className="p-2 border-2 border-gray-400 w-24 break-words whitespace-normal">
                Тип
              </th>
              <th className="p-2 border-2 border-gray-400 w-24 break-words whitespace-normal">
                Редакция
              </th>
              <th className="p-2 border-2 border-gray-400 w-24 break-words whitespace-normal">
                Изд. заявление
              </th>
              <th className="p-2 border-2 border-gray-400 w-32 break-words whitespace-normal">
                Публикация
              </th>
              <th className="p-2 border-2 border-gray-400 w-32 break-words whitespace-normal">
                Физ. описание
              </th>
              <th className="p-2 border-2 border-gray-400 w-24 break-words whitespace-normal">
                Серия
              </th>
              <th className="p-2 border-2 border-gray-400 w-16 break-words whitespace-normal">
                УДК
              </th>
              <th className="p-2 border-2 border-gray-400 w-16 break-words whitespace-normal">
                ББК
              </th>
              <th className="p-2 border-2 border-gray-400 w-24 break-words whitespace-normal">
                Лок. индекс
              </th>
              <th className="p-2 border-2 border-gray-400 w-32 break-words whitespace-normal">
                Авторы
              </th>
              <th className="p-2 border-2 border-gray-400 w-24 break-words whitespace-normal">
                Статус
              </th>
              <th className="p-2 border-2 border-gray-400 w-24 break-words whitespace-normal">
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            {books.length ? (
              books.map((b) => {
                const available = isBookAvailable(b);
                const expanded = expandedBookIds.includes(b.id);
                return (
                  <React.Fragment key={b.id}>
                    <tr
                      onClick={() => toggleExpandBook(b.id)}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="p-2 border break-words whitespace-normal">
                        {b.title || '—'}
                      </td>
                      <td className="p-2 border break-words whitespace-normal">
                        {b.bookType || '—'}
                      </td>
                      <td className="p-2 border break-words whitespace-normal">
                        {b.edit || '—'}
                      </td>
                      <td className="p-2 border break-words whitespace-normal">
                        {b.editionStatement || '—'}
                      </td>
                      <td className="p-2 border break-words whitespace-normal">
                        {b.pubInfo || '—'}
                      </td>
                      <td className="p-2 border break-words whitespace-normal">
                        {b.physDesc || '—'}
                      </td>
                      <td className="p-2 border break-words whitespace-normal">
                        {b.series || '—'}
                      </td>
                      <td className="p-2 border break-words whitespace-normal">
                        {b.udc || '—'}
                      </td>
                      <td className="p-2 border break-words whitespace-normal">
                        {b.bbk || '—'}
                      </td>
                      <td className="p-2 border break-words whitespace-normal">
                        {b.localIndex || '—'}
                      </td>
                      <td className="p-2 border break-words whitespace-normal">
                        {b.authors || '—'}
                      </td>
                      <td className="p-2 border break-words whitespace-normal">
                        {available ? 'Есть в наличии' : 'Нет в наличии'}
                      </td>
                      <td className="p-2 border break-words whitespace-normal">
                        <button
                          onClick={(e) => openEditModal(b, e)}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-1 px-2 rounded mr-1"
                        >
                          Ред.
                        </button>
                        <button
                          onClick={(e) => openDeleteModal(b, e)}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs font-medium py-1 px-2 rounded"
                        >
                          Удл.
                        </button>
                      </td>
                    </tr>
                    {expanded &&
                      b.bookCopies?.map((c) => (
                        <tr key={c.id}>
                          <td colSpan={13} className="p-2 border pl-6 bg-gray-50">
                            <strong>Экземпляр {c.id}</strong>
                            {c.copyInfo ? `: ${c.copyInfo}` : ''}
                            <div className="text-xs text-gray-700 mt-1">
                              {getCopyStatus(c)}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={13} className="p-2 border text-center">
                  Нет книг
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      />

      {/* Модалки */}
      {isEditModalOpen && selectedBookForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow w-96 max-w-full">
            <h3 className="text-lg font-semibold mb-2">
              Редактировать (ID: {selectedBookForEdit.id})
            </h3>
            <label className="text-sm font-medium">Название:</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none mt-1"
            />
            <div className="mt-4 space-x-2">
              <button
                onClick={handleEditSave}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-1 px-3 rounded"
              >
                Сохранить
              </button>
              <button
                onClick={closeEditModal}
                className="bg-gray-300 hover:bg-gray-400 text-black font-medium py-1 px-3 rounded"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedBookForDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow w-96 max-w-full">
            <h3 className="text-lg font-semibold mb-2">Удалить книгу?</h3>
            <p className="text-sm mb-4">
              {selectedBookForDelete.title} (ID: {selectedBookForDelete.id})
            </p>
            <div className="space-x-2">
              <button
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded"
              >
                Удалить
              </button>
              <button
                onClick={closeDeleteModal}
                className="bg-gray-300 hover:bg-gray-400 text-black font-medium py-1 px-3 rounded"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lists;