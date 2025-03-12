import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    OneToMany,
  } from 'typeorm';
  import { Book } from '../books/book.entity';
  import { BorrowRecord } from '../borrow-records/borrow-record.entity';
  
  @Entity('book_copy') // Таблица "book_copy"
  export class BookCopy {
    @PrimaryGeneratedColumn()
    id: number;
  
    // Связь: у одного Book может быть несколько BookCopy
    @ManyToOne(() => Book, (book) => book.bookCopies, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'book_id' })
    book: Book;
  
    // Уникальный инвентарный номер
    @Column({ name: 'inventory_number', unique: true })
    inventoryNumber: string;
  
    // Дата поступления
    @Column({ name: 'acquisition_date', nullable: true })
    acquisitionDate: Date;
  
    // Дата списания (если экземпляр выбыл)
    @Column({ name: 'disposal_date', nullable: true })
    disposalDate: Date;
  
    // Номер акта списания (если списано)
    @Column({ name: 'disposal_act_number', nullable: true })
    disposalActNumber: string;
  
    // Цена
    @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
    price: number;
  
    // Местоположение/Отдел
    @Column({ nullable: true })
    location: string;

    // Если хотите хранить штрихкод/QR-код
    // @Column({ nullable: true })
    // barcode: string;
  
    // Связь с BorrowRecord
    @OneToMany(() => BorrowRecord, (record) => record.bookCopy)
    borrowRecords: BorrowRecord[];
  }