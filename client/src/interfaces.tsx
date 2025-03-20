// interfaces.ts

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

export interface Book {
  id: number;
  title: string | null;
  bookType: string | null;  
  edit: string | null;
  editionStatement: string | null;
  pubInfo: string | null;
  physDesc: string | null;
  series: string | null;
  udc: string | null;
  bbk: string | null;
  localIndex: string | null;
  authors: string | null;
  bookCopies?: BookCopy[];
}

export interface BookCopy {
  id: number;
  copyInfo: string | null;
  book: Book;
  borrowRecords?: BorrowRecord[];
}


export interface BorrowRecord {
  id: number;
  borrowDate: string | null; 
  returnDate: string | null; 
  person?: Person | null;
  issuedByUser?: User;
  acceptedByUser?: User | null;
  bookCopy: BookCopy;
}