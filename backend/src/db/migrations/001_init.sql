-- НАЧАЛЬНАЯ СХЕМА БД

-- юзеры
CREATE TABLE users {
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
} STRICT;


-- справочники (редактирует админ)
-- категриии
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT
) STRICT;

--регионы
CREATE TABLE regions (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  province TEXT,
  country  TEXT NOT NULL DEFAULT 'Китай',
  UNIQUE (name, country)
) STRICT;

-- производство
CREATE TABLE producers (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  name_original TEXT,
  region_id     INTEGER REFERENCES regions (id) ON DELETE RESTRICT,
  website       TEXT
) STRICT;

-- способы заварки
CREATE TABLE brew_methods (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT
) STRICT;


-- каталог чаёв
CREATE TABLE teas (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  name_original TEXT,
  category_id   INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  producer_id   INTEGER REFERENCES producers (id) ON DELETE RESTRICT,
  region_id     INTEGER REFERENCES regions (id) ON DELETE RESTRICT,
  subtype       TEXT,
  harvest_year  INTEGER CHECK (harvest_year IS NULL OR harvest_year BETWEEN 1900 AND 2100),
  description   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE INDEX idx_teas_name        ON teas (name);
CREATE INDEX idx_teas_category_id ON teas (category_id);
CREATE INDEX idx_teas_producer_id ON teas (producer_id);
CREATE INDEX idx_teas_region_id   ON teas (region_id);


-- собственно дневник - дегустации юзеров
CREATE TABLE tastings (
  id              INTEGER PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tea_id          INTEGER NOT NULL REFERENCES teas (id) ON DELETE RESTRICT,
  brew_method_id  INTEGER NOT NULL REFERENCES brew_methods (id) ON DELETE RESTRICT,
  brewed_at       TEXT NOT NULL,
  water_temp_c    INTEGER NOT NULL CHECK (water_temp_c BETWEEN 0 AND 100),
  leaf_g          REAL CHECK (leaf_g IS NULL OR leaf_g > 0),
  water_ml        INTEGER CHECK (water_ml IS NULL OR water_ml > 0),
  steep_note      TEXT,
  -- оценка в половинках звёзд: 1 = 0,5 звезды, 10 = 5 звёзд; NULL = без оценки
  rating          INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 10),
  comment         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE INDEX idx_tastings_user_brewed ON tastings (user_id, brewed_at);
CREATE INDEX idx_tastings_tea_id      ON tastings (tea_id);
CREATE INDEX idx_tastings_brew_method ON tastings (brew_method_id);


-- предложения для добавления в каталог
CREATE TABLE tea_suggestions (
  id            INTEGER PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  name          TEXT NOT NULL,
  name_original TEXT,
  category_id   INTEGER REFERENCES categories (id) ON DELETE RESTRICT,
  -- производитель и регион пользователь вводит текстом: их может не быть в справочниках
  producer_name TEXT,
  region_name   TEXT,
  subtype       TEXT,
  harvest_year  INTEGER CHECK (harvest_year IS NULL OR harvest_year BETWEEN 1900 AND 2100),
  description   TEXT,
  admin_comment TEXT,
  -- если администратора или созданный чай удалят, история предложения сохранится
  reviewed_by   INTEGER REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at   TEXT,
  created_tea_id INTEGER REFERENCES teas (id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE INDEX idx_tea_suggestions_user_id ON tea_suggestions (user_id);
CREATE INDEX idx_tea_suggestions_status  ON tea_suggestions (status);