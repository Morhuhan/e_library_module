// src/components/DeleteConfirmDialog.tsx
import React from 'react';
import BaseDialog from './BaseDialog.tsx';
import { Book, DeleteConfirmDialogProps } from '../utils/interfaces.tsx';
import httpClient from '../utils/httpsClient.tsx';
import { toast } from 'react-toastify';

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({ book, onClose, onDeleted }) => {
  const handleDelete = async () => {
    if (!book) return;
    try {
      await httpClient.delete(`/books/${book.id}`);
      toast.success(`Книга №${book.id} удалена`);
      onDeleted();
    } catch (err) {
      console.error(err);
      toast.error('Не удалось удалить книгу');
    }
  };

  return (
    <BaseDialog
      open={!!book}
      onOpenChange={(v) => !v && onClose()}
      title={`Удалить книгу №${book?.id}?`}
    >
      <p className="text-sm mb-6 text-gray-700">Действие нельзя отменить.</p>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
          onClick={onClose}
        >
          Отмена
        </button>
        <button
          type="button"
          className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700"
          onClick={handleDelete}
        >
          Удалить
        </button>
      </div>
    </BaseDialog>
  );
};

export default DeleteConfirmDialog;