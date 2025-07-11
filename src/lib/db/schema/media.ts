// Media Management Tables Schema

import { relations, sql } from 'drizzle-orm';
import { bigint, check, index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// Media library
export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    filePath: varchar('file_path', { length: 500 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileType: varchar('file_type', { length: 50 }).notNull(), // image, video, audio, pdf
    altText: varchar('alt_text', { length: 255 }),
    uploadedBy: uuid('uploaded_by'),
    uploadedByCustomer: uuid('uploaded_by_customer'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_media_uploaded_by').on(table.uploadedBy),
    index('idx_media_uploaded_by_customer').on(table.uploadedByCustomer),
    // Positive file size constraint
    check('check_positive_file_size', sql`${table.fileSize} > 0`),
  ]
);

// Relations
export const mediaRelations = relations(media, () => ({
  // Relations will be defined in other schema files that reference media
}));
