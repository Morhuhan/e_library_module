import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';

import BaseDialog from './BaseDialog.tsx';
import httpClient from '../utils/httpsClient.tsx';
import AuthorChip from './AuthorChip.tsx';
import CodeChip from './CodeChip.tsx';
import AddAuthorDialog from './AddAuthorDialog.tsx';
import AddBbkDialog from './AddBbkDialog.tsx';
import AddUdkDialog from './AddUdkDialog.tsx';
import AddPublisherDialog, {
  Publisher,
} from './AddPublisherDialog.tsx';
import {
  Author,
  Book,
  EditBookModalProps,
  FormValues,
  bookSchema,
} from '../utils/interfaces.tsx';
import { ClassCode } from './AddBbkDialog.tsx';

const EditBookModal: React.FC<EditBookModalProps> = ({
  book,
  onClose,
  onSaved,
}) => {
  /* ---------- state ---------- */
  const [fullBook, setFullBook] = useState<Book | null>(null);
  const [isBookLoading, setIsBookLoading] = useState(false);

  const [authorsList, setAuthorsList] = useState<Author[]>([]);
  const [bbkList, setBbkList] = useState<ClassCode[]>([]);
  const [udcList, setUdcList] = useState<ClassCode[]>([]);
  const [publisher, setPublisher] = useState<Publisher | null>(null);

  const [addAuthorDlgOpen, setAddAuthorDlgOpen] = useState(false);
  const [addBbkDlgOpen, setAddBbkDlgOpen] = useState(false);
  const [addUdkDlgOpen, setAddUdkDlgOpen] = useState(false);
  const [addPublisherDlgOpen, setAddPublisherDlgOpen] = useState(false);

  /* ---------- form ---------- */
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(bookSchema),
    mode: 'onBlur',
  });

  /* ---------- load full book ---------- */
  useEffect(() => {
    if (!book) return;

    const fetchBook = async () => {
      setIsBookLoading(true);
      try {
        const response = await httpClient.get(`/books/${book.id}`);
        setFullBook(response.data as Book);
      } catch (err) {
        console.error(err);
        toast.error('Не удалось загрузить данные книги');
      } finally {
        setIsBookLoading(false);
      }
    };

    fetchBook();
  }, [book]);

  /* ---------- prefill after load ---------- */
  useEffect(() => {
    if (!fullBook) return;

    reset({
      title: fullBook.title ?? '',
      bookType: fullBook.bookType ?? '',
      edit: fullBook.edit ?? '',
      editionStatement: fullBook.editionStatement ?? '',
      series: fullBook.series ?? '',
      physDesc: fullBook.physDesc ?? '',
      authors: '',
      bbkAbbs: '',
      udcAbbs: '',
      bbkRaw: (fullBook.bbkRaws ?? [])
        .map((r) => r.bbkCode)
        .join(', '),
      udcRaw: (fullBook.udcRaws ?? [])
        .map((r) => r.udcCode)
        .join(', '),
      pubCity: fullBook.publicationPlaces?.[0]?.city ?? '',
      pubName: fullBook.publicationPlaces?.[0]?.publisher?.name ?? '',
      pubYear: fullBook.publicationPlaces?.[0]?.pubYear ?? undefined,
    });

    setAuthorsList(fullBook.authors ?? []);

    setBbkList(
      (fullBook.bbks ?? []).map((b, i) => ({
        id: b.id ?? i,
        code: b.bbkAbb,
      }))
    );
    setUdcList(
      (fullBook.udcs ?? []).map((u, i) => ({
        id: u.id ?? i,
        code: u.udcAbb,
      }))
    );

    setPublisher(
      fullBook.publicationPlaces?.[0]?.publisher
        ? {
            id: fullBook.publicationPlaces[0].publisher.id,
            name: fullBook.publicationPlaces[0].publisher.name,
          }
        : null,
    );
  }, [fullBook, reset]);

  /* ---------- keep hidden fields up-to-date ---------- */
  useEffect(() => {
    const names = authorsList
      .map((a) =>
        [a.lastName, a.firstName, a.patronymic]
          .filter(Boolean)
          .join(' ')
          .trim()
      )
      .join('; ');
    setValue('authors', names, { shouldValidate: false });
  }, [authorsList, setValue]);

  useEffect(() => {
    setValue(
      'bbkAbbs',
      bbkList.map((b) => b.code).join(', '),
      { shouldValidate: false },
    );
  }, [bbkList, setValue]);

  useEffect(() => {
    setValue(
      'udcAbbs',
      udcList.map((u) => u.code).join(', '),
      { shouldValidate: false },
    );
  }, [udcList, setValue]);

  useEffect(() => {
    setValue('pubName', publisher?.name ?? '', { shouldValidate: false });
  }, [publisher, setValue]);

  /* ---------- submit ---------- */
  const submit = handleSubmit(async (values) => {
    if (!fullBook) return;

    const dto: Record<string, any> = {};

    (
      [
        'title',
        'bookType',
        'edit',
        'editionStatement',
        'series',
        'physDesc',
      ] as const
    ).forEach((k) => {
      const v = values[k]?.trim();
      if (v) dto[k] = v;
    });

    if (authorsList.length) dto.authorsIds = authorsList.map((a) => a.id);
    if (bbkList.length) dto.bbkAbbs = bbkList.map((b) => b.code);
    if (udcList.length) dto.udcAbbs = udcList.map((u) => u.code);

    if (values.bbkRaw)
      dto.bbkRawCodes = values.bbkRaw
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    if (values.udcRaw)
      dto.udcRawCodes = values.udcRaw
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

    const city = values.pubCity?.trim();
    const publisherName = publisher?.name ?? values.pubName?.trim();
    const pubYear = values.pubYear;
    if (city || publisherName || pubYear) {
      dto.pubPlaces = [{ city, publisherName, pubYear }];
    }

    try {
      await httpClient.put(`/books/${fullBook.id}`, dto);
      toast.success(`Книга №${fullBook.id} сохранена`);
      onSaved();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        'Не удалось сохранить книгу (см. консоль)';
      console.error(err);
      toast.error(msg);
    }
  });

  /* ---------- UI ---------- */
  return (
    <BaseDialog
      open={!!book}
      onOpenChange={(v) => !v && onClose()}
      title={book ? `Редактировать книгу №${book.id}` : ''}
      widthClass="max-w-2xl"
    >
      {/* spinner */}
      {isBookLoading && (
        <p className="p-4 text-center text-sm text-gray-500">
          Загрузка данных книги…
        </p>
      )}

      {/* form */}
      {!isBookLoading && fullBook && (
        <form
          onSubmit={submit}
          className="space-y-3 max-h-[70vh] overflow-y-auto pr-2"
        >
          {/* simple inputs */}
          {(
            [
              { name: 'title', label: 'Название' },
              { name: 'bookType', label: 'Тип' },
              { name: 'edit', label: 'Редактор' },
              { name: 'editionStatement', label: 'Сведения об изд.' },
              { name: 'series', label: 'Серия' },
              { name: 'physDesc', label: 'Описание (страницы, иллюстрации и т.д.)' },
            ] as const
          ).map((f) => (
            <div key={f.name}>
              <label className="block text-sm mb-1">{f.label}</label>
              <input
                {...register(f.name)}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
          ))}

          {/* authors */}
          <div>
            <label className="block text-sm mb-1">Авторы</label>

            <input type="hidden" {...register('authors')} />

            <div className="flex flex-wrap gap-2">
              {authorsList.map((a) => (
                <AuthorChip
                  key={a.id}
                  name={[a.lastName, a.firstName, a.patronymic]
                    .filter(Boolean)
                    .join(' ')}
                  onRemove={() =>
                    setAuthorsList((list) =>
                      list.filter((x) => x.id !== a.id),
                    )
                  }
                />
              ))}

              <button
                type="button"
                onClick={() => setAddAuthorDlgOpen(true)}
                aria-label="Добавить автора"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-400 text-gray-500 hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          {/* ---------- классификаторы ---------- */}
          {/* BBK */}
          <div>
            <label className="block text-sm mb-1">ББК</label>
            <input type="hidden" {...register('bbkAbbs')} />
            <div className="flex flex-wrap gap-2">
              {bbkList.map((b) => (
                <CodeChip
                  key={b.id}
                  label={b.code}
                  onRemove={() =>
                    setBbkList((list) => list.filter((x) => x.id !== b.id))
                  }
                />
              ))}
              <button
                type="button"
                onClick={() => setAddBbkDlgOpen(true)}
                aria-label="Добавить ББК"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-400 text-gray-500 hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          {/* UDK */}
          <div>
            <label className="block text-sm mb-1">УДК</label>
            <input type="hidden" {...register('udcAbbs')} />
            <div className="flex flex-wrap gap-2">
              {udcList.map((u) => (
                <CodeChip
                  key={u.id}
                  label={u.code}
                  onRemove={() =>
                    setUdcList((list) => list.filter((x) => x.id !== u.id))
                  }
                />
              ))}
              <button
                type="button"
                onClick={() => setAddUdkDlgOpen(true)}
                aria-label="Добавить УДК"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-400 text-gray-500 hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          {/* ---------- устаревшие классификаторы (только чтение) ---------- */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm mb-1 text-gray-500">
                ББК* (устаревшие)
              </label>
              <input
                {...register('bbkRaw')}
                readOnly
                className="w-full rounded border bg-gray-100 px-2 py-1 text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-500">
                УДК* (устаревшие)
              </label>
              <input
                {...register('udcRaw')}
                readOnly
                className="w-full rounded border bg-gray-100 px-2 py-1 text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* ---------- издательство ---------- */}
          <div>
            <label className="block text-sm mb-1">
              Издательство «Город, Издатель, Год»
            </label>

            <div className="grid grid-cols-3 gap-2">
              {/* city */}
              <input
                placeholder="Город"
                {...register('pubCity')}
                className="rounded border px-2 py-1 text-sm"
              />

              {/* publisher picker */}
              <div className="flex items-center gap-1">
                <input type="hidden" {...register('pubName')} />
                <input
                  value={publisher?.name ?? ''}
                  onChange={(e) => {
                    setPublisher(p => p ? { ...p, name: e.target.value } : { id: 0, name: e.target.value });
                    setValue('pubName', e.target.value, { shouldValidate: true });
                  }}
                  onClick={() => setAddPublisherDlgOpen(true)}
                  placeholder="Издатель"
                  className="flex-1 rounded border px-2 py-1 text-sm"
                />
                {publisher && (
                  <button
                    type="button"
                    onClick={() => setPublisher(null)}
                    aria-label="Очистить издателя"
                    className="h-7 w-7 flex items-center justify-center rounded text-gray-500 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* year */}
              <input
                type="number"
                placeholder="Год"
                {...register('pubYear', { valueAsNumber: true })}
                onKeyDown={(e) => {
                  if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                    e.preventDefault();
                  }
                }}
                className="rounded border px-2 py-1 text-sm"
              />
            </div>
          </div>

          {/* действия */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      )}

      {/* --- dialogs --- */}
      <AddAuthorDialog
        open={addAuthorDlgOpen}
        onClose={() => setAddAuthorDlgOpen(false)}
        onPick={(a) =>
          setAuthorsList((list) =>
            list.some((x) => x.id === a.id) ? list : [...list, a],
          )
        }
      />

      <AddBbkDialog
        open={addBbkDlgOpen}
        onClose={() => setAddBbkDlgOpen(false)}
        onPick={(c) =>
          setBbkList((list) =>
            list.some((x) => x.id === c.id) ? list : [...list, c],
          )
        }
      />

      <AddUdkDialog
        open={addUdkDlgOpen}
        onClose={() => setAddUdkDlgOpen(false)}
        onPick={(c) =>
          setUdcList((list) =>
            list.some((x) => x.id === c.id) ? list : [...list, c],
          )
        }
      />

      <AddPublisherDialog
        open={addPublisherDlgOpen}
        onClose={() => setAddPublisherDlgOpen(false)}
        onPick={(p) => setPublisher(p)}
      />
    </BaseDialog>
  );
};

export default EditBookModal;