# Supabase SQL 실행 가이드

> Supabase 대시보드 → **SQL Editor** → 아래 내용 통째로 복사 → **Run**

---

## 실행할 SQL (아래 전체 복사)

-- ForTem 코드 관리 대시보드 DB 스키마
-- Supabase SQL Editor에서 실행
-- 구조: games → collections → items → codes

-- 1. 게임
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  publisher VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 컬렉션 (게임 하위)
CREATE TABLE collections (
  id SERIAL PRIMARY KEY,
  game_id INT NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 아이템 (컬렉션 하위)
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  collection_id INT NOT NULL REFERENCES collections(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(10, 2) NOT NULL DEFAULT 0
);

-- 4. 관리자
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 업로드 배치
CREATE TABLE upload_batches (
  id SERIAL PRIMARY KEY,
  game_id INT NOT NULL REFERENCES games(id),
  item_id INT NOT NULL REFERENCES items(id),
  admin_id INT NOT NULL REFERENCES admins(id),
  file_name VARCHAR(500) NOT NULL,
  total_count INT NOT NULL DEFAULT 0,
  valid_count INT NOT NULL DEFAULT 0,
  duplicate_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 코드
CREATE TABLE codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(500) NOT NULL UNIQUE,
  item_id INT NOT NULL REFERENCES items(id),
  status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'registered', 'sold', 'redeemed')),
  batch_id INT REFERENCES upload_batches(id),
  expires_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 인덱스 (검색 성능용)
CREATE INDEX idx_collections_game_id ON collections(game_id);
CREATE INDEX idx_items_collection_id ON items(collection_id);
CREATE INDEX idx_codes_item_id ON codes(item_id);
CREATE INDEX idx_codes_status ON codes(status);
CREATE INDEX idx_codes_batch_id ON codes(batch_id);
CREATE INDEX idx_codes_code ON codes(code);
CREATE INDEX idx_upload_batches_game_id ON upload_batches(game_id);
CREATE INDEX idx_upload_batches_admin_id ON upload_batches(admin_id);

---

## 테이블 구조

    games (게임)
      └─ collections (컬렉션)
           └─ items (아이템)
                └─ codes (코드)

    admins (관리자)
    upload_batches (업로드 이력)

| 테이블 | 역할 | 주요 컬럼 |
|--------|------|-----------|
| games | 게임 목록 | name, publisher |
| collections | 게임별 컬렉션 | game_id, name, image_url |
| items | 컬렉션별 아이템 | collection_id, name, price |
| codes | 리딤 코드 | code, item_id, status, expires_at, sold_at |
| admins | 운영자 | name, email, role |
| upload_batches | CSV 업로드 기록 | game_id, item_id, admin_id, file_name |

## 코드 상태 흐름

    received(대기) → registered(등록) → sold(판매) → redeemed(사용완료)

## 실행 후 확인

SQL Editor에서 Run 누른 뒤 Table Editor 탭에서 6개 테이블이 보이면 성공:
games, collections, items, admins, upload_batches, codes
