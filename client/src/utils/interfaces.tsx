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
  middleName?: string;
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
/* src/types/author.ts */
export interface Author {
  id: number;
  fullName: string;
}

/* src/types/bbk.ts */
export interface Bbk {
  id: number;
  bbkAbb: string;
  description: string | null;
}

/* src/types/udc.ts */
export interface Udc {
  id: number;
  udcAbb: string;
  description: string | null;
}

/* src/types/bbkRaw.ts */
export interface BookBbkRaw {
  bookId: number;
  bbkCode: string;
}

/* src/types/udcRaw.ts */
export interface BookUdcRaw {
  bookId: number;
  udcCode: string;
}

/* src/types/publisher.ts */
export interface Publisher {
  id: number;
  name: string;
}

/* src/types/bookPubPlace.ts */
export interface BookPubPlace {
  id: number;
  bookId: number;
  publisher: Publisher | null;
  city: string | null;
  pubYear: number | null;
}

/* src/types/bookCopy.ts */
export interface BookCopy {
  id: number;
  copyInfo: string | null;
  book: Book;                 // forward ref
  borrowRecords?: BorrowRecord[];
}

/* src/types/borrowRecord.ts */
export interface BorrowRecord {
  id: number;
  borrowDate: string;
  dueDate: string | null;
  returnDate: string | null;
  person?: Person | null;
  issuedByUser?: User;
  acceptedByUser?: User | null;
  bookCopy: BookCopy;
}

/* src/types/book.ts */
export interface Book {
  id: number;
  title: string | null;
  bookType: string | null;
  edit: string | null;
  editionStatement: string | null;
  physDesc: string | null;
  series: string | null;
  localIndex: string | null;

  authors: Author[] | null;
  bbks: Bbk[] | null;
  udcs: Udc[] | null;

  /** старые классификаторы */
  bbkRaws: BookBbkRaw[] | null;
  udcRaws: BookUdcRaw[] | null;

  bookCopies: BookCopy[] | null;
  publicationPlaces: BookPubPlace[] | null;
}