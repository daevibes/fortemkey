-- ForTem 코드 관리 대시보드 DB 스키마
-- Supabase SQL Editor에서 실행
-- 구조: games → collections → items → codes

-- 게임
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  publisher VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 컬렉션 (게임 하위)
CREATE TABLE collections (
  id SERIAL PRIMARY KEY,
  game_id INT NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 아이템 (컬렉션 하위)
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  collection_id INT NOT NULL REFERENCES collections(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(10, 2) NOT NULL DEFAULT 0
);

-- 관리자
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 업로드 배치
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
  file_path TEXT,
  validation_details JSONB,
  promotions JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 코드
CREATE TABLE codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(500) NOT NULL UNIQUE,
  item_id INT NOT NULL REFERENCES items(id),
  status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'registered', 'sold')),
  batch_id INT REFERENCES upload_batches(id),
  expires_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_collections_game_id ON collections(game_id);
CREATE INDEX idx_items_collection_id ON items(collection_id);
CREATE INDEX idx_codes_item_id ON codes(item_id);
CREATE INDEX idx_codes_status ON codes(status);
CREATE INDEX idx_codes_batch_id ON codes(batch_id);
CREATE INDEX idx_codes_code ON codes(code);
CREATE INDEX idx_upload_batches_game_id ON upload_batches(game_id);
CREATE INDEX idx_upload_batches_admin_id ON upload_batches(admin_id);

-- RLS (Row Level Security) 비활성화 — 내부 운영 툴이라 불필요
-- 필요 시 아래 주석 해제하여 활성화
-- ALTER TABLE games ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE codes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;
