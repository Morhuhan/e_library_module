// src/utils/interfaces.tsx
import { z } from 'zod';
import { ReactNode } from 'react';

/* ---------- базовые ---------- */
export interface User {
  id: number;
  username: string;
  pass?: string;
}

export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  patronymic: string;
  sex: string;
  birthDate: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
}

export interface ErrorResponse {
  message?: string;
  error?: string;
}

/* ---------- доменные ---------- */
export interface Author {
  id: number;
  firstName: string;
  patronymic: string | null;
  lastName: string;
  birthYear: number | null;
}

export interface Bbk {
  id: number;
  bbkAbb: string;
  description: string | null;
}

export interface Udc {
  id: number;
  udcAbb: string;
  description: string | null;
}

export interface BookBbkRaw {
  bookId: number;
  bbkCode: string;
}

export interface BookUdcRaw {
  bookId: number;
  udcCode: string;
}

export interface Publisher {
  id: number;
  name: string;
}

export interface BookPubPlace {
  id: number;
  bookId: number;
  publisher: Publisher | null;
  city: string | null;
  pubYear: number | null;
}

export interface BookCopy {
  id: number;
  inventoryNo: string;
  receiptDate: string | null;
  storagePlace: string | null;
  price: number | null;
  book: Book;
  borrowRecords?: BorrowRecord[];
}

export interface BorrowRecord {
  id: number;
  borrowDate: string;
  expectedReturnDate: string | null;
  dueDate: string | null;
  returnDate: string | null;
  person?: Person | null;
  issuedByUser?: User;
  acceptedByUser?: User | null;
  bookCopy: BookCopy;
}

export interface Book {
  id: number;
  title: string | null;
  bookType: string | null;
  edit: string | null;
  editionStatement: string | null;
  physDesc: string | null;
  series: string | null;
  authors: Author[] | null;
  bbks: Bbk[] | null;
  udcs: Udc[] | null;
  bbkRaws: BookBbkRaw[] | null;
  udcRaws: BookUdcRaw[] | null;
  bookCopies: BookCopy[] | null;
  publicationPlaces: BookPubPlace[] | null;
}

/* ---------- для компонентов ---------- */
export interface AuthorChipProps {
  name: string;
  onRemove: () => void;
}

export interface BaseDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: ReactNode;
  widthClass?: string;
}

export interface DeleteConfirmDialogProps {
  book: Book | null;
  onClose: () => void;
  onDeleted: () => void;
}

export interface AddAuthorDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (author: Author) => void;
}

export interface EditBookModalProps {
  book: Book | null;
  onClose: () => void;
  onSaved: () => void;
}

export const bookSchema = z.object({
  title: z.string().optional(),
  bookType: z.string().optional(),
  edit: z.string().optional(),
  editionStatement: z.string().optional(),
  series: z.string().optional(),
  physDesc: z.string().optional(),
  authors: z.string().optional(),
  bbkAbbs: z.string().optional(),
  udcAbbs: z.string().optional(),
  bbkRaw: z.string().optional(),
  udcRaw: z.string().optional(),
  pubCity: z.string().optional(),
  pubName: z.string().optional(),
  pubYear: z.number().optional(),
});

export type FormValues = z.infer<typeof bookSchema>;