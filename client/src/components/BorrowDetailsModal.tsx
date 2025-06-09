// src/components/BorrowDetailsModal.tsx
import React, { useEffect, useState } from 'react';
import BaseDialog from './BaseDialog.tsx';
import httpClient from '../utils/httpsClient.tsx';
import { Book, Person } from '../utils/interfaces.tsx';
import AddPersonDialog from './AddPersonDialog.tsx';
import { toast } from 'react-toastify';

interface Props {
  bookId: number | null;
  actionType: 'borrow' | 'return';
  onClose: () => void;
  onDone: () => void;
}

const dash = '—';

const fmtAuthors = (l: any[] | null | undefined) =>
  l?.length
    ? l
        .map(a =>
          [a.lastName, a.firstName, a.patronymic].filter(Boolean).join(' '),
        )
        .join('; ')
    : dash;

const fmtBbks = (l: any[] | null | undefined) =>
  l?.length ? l.map(b => b.bbkAbb).join(', ') : dash;

const fmtUdcs = (l: any[] | null | undefined) =>
  l?.length ? l.map(u => u.udcAbb).join(', ') : dash;

const fmtRaw = (
  raw: { bbkCode?: string; udcCode?: string }[] | null | undefined,
  key: 'bbkCode' | 'udcCode',
) => (raw?.length ? raw.map(r => r[key]).join(', ') : dash);

const BorrowDetailsModal: React.FC<Props> = ({
  bookId,
  actionType,
  onClose,
  onDone,
}) => {
  const [book, setBook] = useState<Book | null>(null);
  const [copyId, setCopyId] = useState<number | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addPersonDlgOpen, setAddPersonDlgOpen] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    setIsLoading(true);
    httpClient
      .get<Book>(`/books/${bookId}`)
      .then(r => setBook(r.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [bookId]);

  if (!bookId) return null;

  const copies =
    book?.bookCopies?.filter(c => {
      const borrowed = c.borrowRecords?.some(r => !r.returnDate);
      return actionType === 'borrow' ? !borrowed : borrowed;
    }) ?? [];

  const handleAction = async () => {
    if (!copyId) return;

    try {
      if (actionType === 'borrow') {
        if (!person) return;
        await httpClient.post('/borrow-records', {
          bookCopyId: copyId,
          personId: person.id,
        });
        toast.success('Экземпляр выдан');
      } else {
        const rec = book!.bookCopies!
          .find(c => c.id === copyId)!
          .borrowRecords!.find(r => !r.returnDate)!;
        await httpClient.patch(`/borrow-records/${rec.id}/return`, {});
        toast.success('Экземпляр принят');
      }
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Не удалось выполнить действие');
    }
  };

  return (
    <BaseDialog
      open={!!bookId}
      onOpenChange={v => !v && onClose()}
      title={
        book
          ? `Книга №${book.id}: ${book.title || '(без названия)'}`
          : 'Данные книги'
      }
      widthClass="max-w-lg"
    >
      {isLoading && (
        <p className="p-4 text-center text-sm text-gray-500">
          Загрузка данных…
        </p>
      )}

      {!isLoading && book && (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 text-sm">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-1">
            <dt className="font-medium">Название:</dt>
            <dd>{book.title || dash}</dd>

            <dt className="font-medium">Индекс:</dt>
            <dd>{book.localIndex || dash}</dd>

            <dt className="font-medium">Тип:</dt>
            <dd>{book.bookType || dash}</dd>

            <dt className="font-medium">Редактор:</dt>
            <dd>{book.edit || dash}</dd>

            <dt className="font-medium">Сведения&nbsp;об&nbsp;изд.:</dt>
            <dd>{book.editionStatement || dash}</dd>

            <dt className="font-medium">Серия:</dt>
            <dd>{book.series || dash}</dd>

            <dt className="font-medium">Описание:</dt>
            <dd>{book.physDesc || dash}</dd>

            <dt className="font-medium">Авторы:</dt>
            <dd>{fmtAuthors(book.authors)}</dd>

            <dt className="font-medium">ББК:</dt>
            <dd>{fmtBbks(book.bbks)}</dd>

            <dt className="font-medium">УДК:</dt>
            <dd>{fmtUdcs(book.udcs)}</dd>

            <dt className="font-medium">ББК*:</dt>
            <dd>{fmtRaw(book.bbkRaws, 'bbkCode')}</dd>

            <dt className="font-medium">УДК*:</dt>
            <dd>{fmtRaw(book.udcRaws, 'udcCode')}</dd>

            <dt className="font-medium">Издательство:</dt>
            <dd>
              {book.publicationPlaces?.length ? (
                <>
                  {book.publicationPlaces[0].city || dash},{' '}
                  {book.publicationPlaces[0].publisher?.name || dash},{' '}
                  {book.publicationPlaces[0].pubYear || dash}
                </>
              ) : (
                dash
              )}
            </dd>
          </dl>

          <div className="space-y-3 pt-2 border-t">
            <div>
              <label className="block mb-1">Экземпляр</label>
              <select
                className="border rounded w-full px-2 py-1"
                value={copyId ?? ''}
                onChange={e => setCopyId(Number(e.target.value))}
              >
                <option value="">-- выберите --</option>
                {copies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.copyInfo || `Экземпляр #${c.id}`}
                  </option>
                ))}
              </select>
            </div>

            {actionType === 'borrow' && (
              <div>
                <label className="block mb-1">Читатель</label>
                <input
                  type="text"
                  readOnly
                  onClick={() => setAddPersonDlgOpen(true)}
                  value={
                    person
                      ? `${person.lastName} ${person.firstName}${
                          person.patronymic ? ` ${person.patronymic}` : ''
                        }`
                      : ''
                  }
                  placeholder="Нажмите, чтобы выбрать читателя"
                  className="w-full rounded border px-2 py-1 text-sm bg-gray-50 cursor-pointer hover:bg-gray-200 hover:border-blue-500 transition-colors duration-200"
                />
              </div>
            )}

            <button
              onClick={handleAction}
              disabled={!copyId || (actionType === 'borrow' && !person)}
              className={`w-full py-2 rounded text-white ${
                actionType === 'borrow'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              } disabled:opacity-50`}
            >
              {actionType === 'borrow' ? 'Выдать' : 'Принять'}
            </button>
          </div>
        </div>
      )}

      <AddPersonDialog
        open={addPersonDlgOpen}
        onClose={() => setAddPersonDlgOpen(false)}
        onPick={setPerson}
      />
    </BaseDialog>
  );
};

export default BorrowDetailsModal;