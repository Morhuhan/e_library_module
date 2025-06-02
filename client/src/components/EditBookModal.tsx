import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';

import BaseDialog from './BaseDialog.tsx';
import type { Book } from '../utils/interfaces.tsx';
import httpClient from '../utils/httpsClient.tsx';

/* ---------- схема ---------- */
const schema = z.object({
  title:            z.string().optional(),
  localIndex:       z.string().optional(),
  bookType:         z.string().optional(),
  edit:             z.string().optional(),
  editionStatement: z.string().optional(),
  series:           z.string().optional(),
  physDesc:         z.string().optional(),
  authors:   z.string().optional(),
  bbkAbbs:   z.string().optional(),
  udcAbbs:   z.string().optional(),
  bbkRaw:    z.string().optional(),
  udcRaw:    z.string().optional(),
  pubCity:   z.string().optional(),
  pubName:   z.string().optional(),
  pubYear:   z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  book: Book | null;
  onClose: () => void;
  onSaved: () => void;
}

const EditBookModal: React.FC<Props> = ({ book, onClose, onSaved }) => {
  const {
    register, handleSubmit, reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur' });

  /* ---------- префилл ---------- */
  useEffect(() => {
    if (!book) return;
    reset({
      title:  book.title  ?? '',
      localIndex: book.localIndex ?? '',
      bookType:   book.bookType   ?? '',
      edit:       book.edit       ?? '',
      editionStatement: book.editionStatement ?? '',
      series:     book.series     ?? '',
      physDesc:   book.physDesc   ?? '',
      authors:  (book.authors ?? []).map(a => a.fullName).join('; '),
      bbkAbbs:  (book.bbks   ?? []).map(b => b.bbkAbb).join(', '),
      udcAbbs:  (book.udcs   ?? []).map(u => u.udcAbb).join(', '),
      bbkRaw:   (book.bbkRaws ?? []).map(r => r.bbkCode).join(', '),
      udcRaw:   (book.udcRaws ?? []).map(r => r.udcCode).join(', '),
      pubCity: book.publicationPlaces?.[0]?.city            ?? '',
      pubName: book.publicationPlaces?.[0]?.publisher?.name ?? '',
      pubYear: book.publicationPlaces?.[0]?.pubYear?.toString() ?? '',
    });
  }, [book, reset]);

  /* ---------- helpers ---------- */
  /** разбор строки &rarr; уникальный массив */
  const toArr = (s?: string, sep = ',') =>
    [...new Set((s ?? '')
      .split(sep)
      .map(x => x.trim())
      .filter(Boolean))];

  /* ---------- submit ---------- */
  const submit = handleSubmit(async values => {
    if (!book) return;

    /* базовые строки */
    const dto: Record<string, any> = {};
    (
      ['title','localIndex','bookType','edit',
       'editionStatement','series','physDesc'] as const
    ).forEach(k => {
      const v = values[k]?.trim();
      if (v) dto[k] = v;
    });

    /* массивы */
    if (values.authors) dto.authorsNames = toArr(values.authors, ';');
    if (values.bbkAbbs) dto.bbkAbbs       = toArr(values.bbkAbbs);
    if (values.udcAbbs) dto.udcAbbs       = toArr(values.udcAbbs);
    if (values.bbkRaw)  dto.bbkRawCodes   = toArr(values.bbkRaw);
    if (values.udcRaw)  dto.udcRawCodes   = toArr(values.udcRaw);

    /* издательство – включаем **только** если хоть что-то ввели */
    const city = values.pubCity?.trim();
    const publisherName = values.pubName?.trim();
    const pubYear = values.pubYear ? Number(values.pubYear) : undefined;
    if (city || publisherName || pubYear) {
      dto.pubPlaces = [{ city, publisherName, pubYear }];
    }

    try {
      await httpClient.put(`/books/${book.id}`, dto);
      toast.success(`Книга №${book.id} сохранена`);
      onSaved();
    } catch (err: any) {
      /* покажем текст ошибки сервера, если есть */
      const msg =
        err?.response?.data?.message ||
        'Не удалось сохранить книгу (см. консоль)';
      console.error(err);
      toast.error(msg);
    }
  });

  /* ---------- UI ---------- */
  return (
    <BaseDialog
      open={!!book}
      onOpenChange={v => !v && onClose()}
      title={book ? `Редактировать книгу №${book.id}` : ''}
      widthClass="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
        {/* простые поля */}
        {(
          [
            { name: 'title', label: 'Название' },
            { name: 'localIndex', label: 'Индекс' },
            { name: 'bookType', label: 'Тип' },
            { name: 'edit', label: 'Редактор' },
            { name: 'editionStatement', label: 'Сведения об изд.' },
            { name: 'series', label: 'Серия' },
            { name: 'physDesc', label: 'Страницы' },
          ] as const
        ).map(f => (
          <div key={f.name}>
            <label className="block text-sm mb-1">{f.label}</label>
            <input
              {...register(f.name)}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
        ))}

        {/* составные и классификаторы */}
        <div>
          <label className="block text-sm mb-1">Авторы (через ;)</label>
          <input {...register('authors')} className="w-full rounded border px-2 py-1 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm mb-1">ББК (через ,)</label>
            <input {...register('bbkAbbs')} className="w-full rounded border px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">УДК (через ,)</label>
            <input {...register('udcAbbs')} className="w-full rounded border px-2 py-1 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm mb-1">ББК* (сырые)</label>
            <input {...register('bbkRaw')} className="w-full rounded border px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">УДК* (сырые)</label>
            <input {...register('udcRaw')} className="w-full rounded border px-2 py-1 text-sm" />
          </div>
        </div>

        {/* издательство */}
        <div>
          <label className="block text-sm mb-1">Издательство &laquo;Город, Издатель, Год&raquo;</label>
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Город"  {...register('pubCity')} className="rounded border px-2 py-1 text-sm" />
            <input placeholder="Издатель" {...register('pubName')} className="rounded border px-2 py-1 text-sm" />
            <input placeholder="Год"    {...register('pubYear')} className="rounded border px-2 py-1 text-sm" />
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
    </BaseDialog>
  );
};

export default EditBookModal;