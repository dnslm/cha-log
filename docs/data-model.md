# Модель данных (v0.2)

Черновик. В голове появился образ конечного продукта. 
Заменяет версию v0.1: каталог чаёв теперь общий, добавлены аккаунты с ролями, справочники и предложения новых чаёв. В MVP 8(восемь) таблиц.

## ER-диаграмма

```mermaid
erDiagram
    USERS ||--o{ TASTINGS : writes
    USERS ||--o{ TEA_SUGGESTIONS : submits
    TEAS ||--o{ TASTINGS : "is tasted in"
    BREW_METHODS ||--o{ TASTINGS : "is used in"
    CATEGORIES ||--o{ TEAS : groups
    PRODUCERS ||--o{ TEAS : makes
    REGIONS ||--o{ TEAS : "is origin of"
    REGIONS ||--o{ PRODUCERS : "is home of"

    USERS {
        int id PK
        text email "уникальный"
        text password_hash
        text display_name
        text role "user или admin"
        datetime created_at
    }

    CATEGORIES {
        int id PK
        text name "уникальный"
        text description
    }

    REGIONS {
        int id PK
        text name
        text province
        text country
    }

    PRODUCERS {
        int id PK
        text name
        text name_original
        int region_id FK "необязательно"
        text website
    }

    TEAS {
        int id PK
        text name
        text name_original "пиньинь или иероглифы"
        int category_id FK
        int producer_id FK "необязательно"
        int region_id FK "необязательно"
        text subtype "вид или сорт"
        int harvest_year "необязательно"
        text description
        datetime created_at
        datetime updated_at
    }

    BREW_METHODS {
        int id PK
        text name "уникальный"
        text description
    }

    TASTINGS {
        int id PK
        int user_id FK
        int tea_id FK
        int brew_method_id FK
        datetime brewed_at
        int water_temp_c
        decimal leaf_g "необязательно"
        int water_ml "необязательно"
        text steep_note "время и проливы, необязательно"
        int rating "1-10, необязательно"
        text comment
        datetime created_at
        datetime updated_at
    }

    TEA_SUGGESTIONS {
        int id PK
        int user_id FK
        text status "pending, approved или rejected"
        text name
        text name_original
        int category_id FK "необязательно"
        text producer_name "свободный текст"
        text region_name "свободный текст"
        text subtype
        int harvest_year
        text description
        text admin_comment
        int reviewed_by FK "необязательно, users.id"
        datetime reviewed_at
        int created_tea_id FK "необязательно, teas.id"
        datetime created_at
    }
```

## Назначение таблиц

| Таблица | Что хранит | Кто редактирует |
|---------|------------|-----------------|
| `users` | Аккаунты, хеш пароля, роль | Сам пользователь, администратор |
| `categories` | Категории чая: улун, белый, пуэр, зелёный, красный и т. д. | Администратор |
| `regions` | Регионы происхождения | Администратор |
| `producers` | Производители (фабрики, плантации, бренды) | Администратор |
| `teas` | Каталог чаёв | Администратор |
| `brew_methods` | Способы заваривания (гунфу-ча, европейский, холодный настой…) | Администратор |
| `tastings` | Дегустации пользователей: способ, температура, оценка, комментарий | Автор дегустации |
| `tea_suggestions` | Предложения новых чаёв и их статус | Автор (создаёт), администратор (рассматривает) |

## Решения и обоснование

**Каталог общий, личное отдельно.** В v0.1 у чая были цена, вес и продавец, потому что чай был личным. Теперь `teas` описывает сам чай и принадлежит всем, а то, что делает конкретный пользователь, лежит в `tastings`. Цена и продавец из модели убраны. Если понадобятся, их можно вернуть в виде «моей коллекции».

**Оценка в каждой дегустации.** Один чай по-разному раскрывается при разных способах заваривания, поэтому оценка хранится в `tastings`. Средняя оценка чая считается запросом (`AVG(rating)` по дегустациям этого чая) и в БД не хранится. Оценка хранится целым числом от 1 до 10 с ограничением `CHECK (rating BETWEEN 1 AND 10)` и показывается в интерфейсе звёздами (значение делится на 2). `NULL` означает «без оценки».

**Справочники вместо текстовых полей.** Категории, регионы, производители и способы заваривания вынесены в отдельные таблицы. Это убирает неточности ("Улун" и "улун") и делает фильтры надёжными.

**Время и проливы.** Таблицы проливов в MVP нет: достаточно необязательного поля `steep_note`. Если понадобится подробнее, таблицу `infusions` можно вернуть позже.

**Предложения.** Производитель и регион в `tea_suggestions` хранятся текстом, потому что пользователь может предложить чай с производителем, которого ещё нет в справочнике. При одобрении администратор сопоставляет текст со справочником (или создаёт новую запись) и создаёт чай; ссылка на него сохраняется в `created_tea_id`.

**Роли.** Роль хранится в поле `users.role` (`user` или `admin`), отдельная таблица ролей в MVP не нужна. Права проверяются на сервере, а не только в интерфейсе. Пароли хранятся только в виде хеша.

**Удаление.**
- Запись справочника или чай, на которые есть ссылки, удалять нельзя (`ON DELETE RESTRICT`).
- При удалении пользователя удаляются его дегустации и предложения (`ON DELETE CASCADE`).

## Следующий слой (после MVP)

- `tags` и связь с чаем или дегустацией (см. открытые вопросы в ТЗ).
- `collections` и `collection_items`: коллекции чаёв пользователя.
- `infusions`: проливы, если понадобятся.

## Открытые вопросы

- Уникальность чая: достаточно ли пары `(name, producer_id, harvest_year)`, чтобы не допускать дубликатов в каталоге?
- Нужна ли иерархия регионов (провинция → район) или хватит двух текстовых полей?
- Один пользователь может оставить несколько дегустаций одного чая с одним и тем же способом заваривания?