// BorrowDetailsModal.tsx
import React, { useEffect, useState } from 'react';
import BaseDialog from './BaseDialog.tsx';
import httpClient from '../utils/httpsClient.tsx';
import { Book, Person } from '../utils/interfaces.tsx';
import AddPersonDialog from './AddPersonDialog.tsx';
import { toast } from 'react-toastify';
import Select from 'react-select';

interface Props {
  bookId: number | null;
  actionType: 'borrow' | 'return';
  onClose: () => void;
  onDone: () => void;
}

const dash = '—';

const fmtAuthors = (l: any[] | null | undefined) =>
  l?.length
    ? l.map(a => [a.lastName, a.firstName, a.patronymic].filter(Boolean).join(' ')).join('; ')
    : dash;

const fmtBbks = (l: any[] | null | undefined) =>
  l?.length ? l.map(b => b.bbkAbb).join(', ') : dash;

const fmtUdcs = (l: any[] | null | undefined) =>
  l?.length ? l.map(u => u.udcAbb).join(', ') : dash;

const fmtRaw = (
  raw: { bbkCode?: string; udcCode?: string }[] | null | undefined,
  key: 'bbkCode' | 'udcCode',
) => (raw?.length ? raw.map(r => r[key]).join(', ') : dash);

const copyLabel = (c: any) =>
  c.inventoryNo
    ? `${c.inventoryNo}${c.storagePlace ? ` — ${c.storagePlace}` : ''}`
    : `Экземпляр #${c.id}`;

const BorrowDetailsModal: React.FC<Props> = ({ bookId, actionType, onClose, onDone }) => {
  const [book, setBook] = useState<Book | null>(null);
  const [copyId, setCopyId] = useState<number | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addPersonDlgOpen, setAddPersonDlgOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(!!bookId);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });

  // Sync dialog visibility
  useEffect(() => {
    setIsOpen(!!bookId);
  }, [bookId]);

  // Reset selected copy on book / action change
  useEffect(() => {
    setCopyId(null);
  }, [bookId, actionType]);

  // Fetch book data
  useEffect(() => {
    if (!bookId) return;
    setIsLoading(true);
    httpClient
      .get<Book>(`/books/${bookId}`)
      .then(r => {
        setBook(r.data);
        const availableCopies =
          r.data.bookCopies?.filter(c => {
            const borrowed = c.borrowRecords?.some(r => !r.returnDate);
            return actionType === 'borrow' ? !borrowed : borrowed;
          }) ?? [];
        if (availableCopies.length > 0) {
          setCopyId(availableCopies[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [bookId, actionType]);

  if (!bookId) return null;

  const copies =
    book?.bookCopies?.filter(c => {
      const borrowed = c.borrowRecords?.some(r => !r.returnDate);
      return actionType === 'borrow' ? !borrowed : borrowed;
    }) ?? [];

  const copyOptions = copies.map(c => ({
    value: c.id,
    label: copyLabel(c),
  }));

  const handleAction = async () => {
    if (!copyId) return;

    try {
      if (actionType === 'borrow') {
        if (!person) return;
        await httpClient.post('/borrow-records', {
          bookCopyId: copyId,
          personId: person.id,
          expectedReturnDate,
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

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      borderRadius: '0.375rem',
      border: '1px solid #d1d5db',
      padding: '0 0.5rem',
      height: '1.9rem',
      minHeight: '1.9rem',
      backgroundColor: '#f9fafb',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      transition: 'all 0.2s ease-in-out',
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
      cursor: 'pointer',
      '&:hover': {
        borderColor: '#3b82f6',
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      borderRadius: '0.375rem',
      marginTop: '0',
      marginBottom: '0',
      border: '1px solid #d1d5db',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      backgroundColor: '#ffffff',
      opacity: 1,
      transform: 'translateY(0)',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
      zIndex: 9999,
    }),
    menuList: (provided: any) => ({
      ...provided,
      padding: '0',
      maxHeight: '200px',
      overflowY: 'auto',
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#e5e7eb' : '#ffffff',
      color: state.isSelected ? '#ffffff' : '#1f2937',
      padding: '0.5rem 1rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease-in-out',
      fontSize: '0.875rem',
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: '#1f2937',
      fontSize: '0.875rem',
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#9ca3af',
      fontSize: '0.875rem',
    }),
    indicatorsContainer: (provided: any) => ({
      ...provided,
      height: '1.9rem',
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '0',
    }),
  };

  return (
    <>
      <BaseDialog
        open={isOpen}
        onOpenChange={v => {
          if (!v) {
            setIsOpen(false);
            setTimeout(onClose, 300);
          }
        }}
        title={book ? `Книга №${book.id}: ${book.title || '(без названия)'}` : 'Данные книги'}
        widthClass="max-w-lg"
      >
        <div
          className="transition-opacity duration-300 ease-in-out"
          style={{ opacity: isOpen ? 1 : 0 }}
        >
          {isLoading && (
            <p className="p-4 text-center text-sm text-gray-500">Загрузка данных…</p>
          )}

          {!isLoading && book && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 text-sm">
              <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-1">
                <dt className="font-medium">Название:</dt>
                <dd>{book.title || dash}</dd>

                <dt className="font-medium">Тип:</dt>
                <dd>{book.bookType || dash}</dd>

                <dt className="font-medium">Редактор:</dt>
                <dd>{book.edit || dash}</dd>

                <dt className="font-medium">Сведения об изд.:</dt>
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
                  <label className="block mb-1 text-sm font-medium text-gray-700">Экземпляр:</label>
                  <Select
                    options={copyOptions}
                    value={copyOptions.find(option => option.value === copyId)}
                    onChange={(option: any) => setCopyId(option ? option.value : null)}
                    placeholder="Выберите экземпляр..."
                    styles={customStyles}
                    isSearchable={false}
                    isClearable={false}
                    noOptionsMessage={() => 'Нет доступных экз.'}
                    className="w-full max-w-full"
                    menuPlacement="auto"
                    menuShouldBlockScroll={true}
                  />
                </div>

                {actionType === 'borrow' && (
                  <>
                    <div>
                      <label className="block mb-1">Читатель:</label>
                      <input
                        type="text"
                        readOnly
                        onClick={() => setAddPersonDlgOpen(true)}
                        value={
                          person
                            ? `${person.lastName || ''} ${person.firstName || ''}${
                                person?.patronymic ? ` ${person.patronymic}` : ''
                              }`.trim()
                            : ''
                        }
                        placeholder="Нажмите, чтобы выбрать читателя"
                        className="w-full rounded-md border px-2 py-1 text-sm bg-gray-50 cursor-pointer hover:bg-gray-100 hover:border-blue-500 transition-colors duration-200"
                      />
                    </div>

                    <div>
                      <label className="block mb-1">Срок возврата:</label>
                      <input
                        type="date"
                        value={expectedReturnDate}
                        onChange={e => setExpectedReturnDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-md border px-2 py-1 text-sm bg-gray-50"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300 transition-colors duration-200"
                    onClick={onClose}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleAction}
                    disabled={
                      !copyId || (actionType === 'borrow' && (!person || !expectedReturnDate))
                    }
                    className={`rounded px-4 py-1 text-sm text-white ${
                      actionType === 'borrow'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-red-500 hover:bg-red-600'
                    } disabled:opacity-50 transition-colors duration-200`}
                  >
                    {actionType === 'borrow' ? 'Выдать' : 'Принять'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </BaseDialog>
      <AddPersonDialog
        open={addPersonDlgOpen}
        onClose={() => setAddPersonDlgOpen(false)}
        onPick={setPerson}
      />
    </>
  );
};

export default BorrowDetailsModal;