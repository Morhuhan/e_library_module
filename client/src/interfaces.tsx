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
  title: string;
  author: string;
  publishedYear: number;
  udc?: string | null;
  grnti?: string | null;
  isbn?: string | null;
  publisher?: string | null;
  category?: string | null;
  pages?: number | null;
  bookCopies?: BookCopy[];
}

export interface BookCopy {
  id: number;
  inventoryNumber: string;
  acquisitionDate?: string | null; 
  disposalDate?: string | null;    
  disposalActNumber?: string | null;
  price?: number | null;
  location?: string | null;
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