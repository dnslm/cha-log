import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DEFAULT_PATH = 'data/cha-log.db';

// открывает базу данных. путь берётся из переменной окружения DATABASE_PATH,
// по умолчанию файл лежит в backend/data/. для тестов можно передать ':memory:'
// (база в оперативке, исчезает при закрытии).
export function openDatabase(path = process.env.DATABASE_PATH || DEFAULT_PATH) {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);

  // в SQLite проверка внешних ключей включается отдельно для каждого соединения.
  // без этого ON DELETE RESTRICT и CASCADE из схемы не работали бы.
  db.exec('PRAGMA foreign_keys = ON');

  return db;
}
