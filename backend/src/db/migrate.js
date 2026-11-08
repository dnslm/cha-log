// запуск миграций из командной строки: npm run migrate
import { openDatabase } from './connection.js';
import { runMigrations } from './migrations.js';

const db = openDatabase();

try {
  const applied = runMigrations(db);

  if (applied.length === 0) {
    console.log('База данных актуальна, новых миграций нет.');
  } else {
    console.log(`Применены миграции: ${applied.join(', ')}`);
  }
} finally {
  db.close();
}
