# ForTem 코드 관리 대시보드 — 서비스 현황

> 최종 업데이트: 2026-03-16

---

## 서비스 아키텍처

- **프레임워크**: Next.js 16 (App Router, TypeScript)
- **DB**: Supabase (PostgreSQL) — **연동 완료**, Supabase 미설정 시 인메모리 Store 자동 fallback
- **데이터 흐름**: 프론트엔드 → API Route → `supabase-queries.ts` → Supabase DB (또는 Store fallback)
- **배포**: Vercel

### 데이터 레이어 구조
```
프론트엔드 (페이지)
  ↓ fetch
API Route (/api/*)
  ↓ import
supabase-queries.ts (쿼리 헬퍼)
  ├─ Supabase 연결됨 → PostgreSQL 쿼리
  └─ Supabase 미연결 → store.ts (인메모리 fallback)
```

---

## 페이지별 구현 현황

### 1. 대시보드 (`/`)
- KPI 카드 4개: 전체 코드, 대기 중, 등록 완료, 판매 완료
- 재고 부족 경고 (30건 이하)
- 만료 임박 경고 (14일 이내, D-day 배지, 3일 이하 빨간색)
- 최근 업로드 5건 리스트

### 2. 코드 업로드 (`/upload`)
- CSV 양식: `아이템명,코드,가격` 3열
- 플로우: 게임/컬렉션/담당자/만료일 선택 → CSV 업로드 → 검증 프리뷰 → 코드 저장
- 게임/컬렉션 인라인 추가, 만료일 설정, 신규 아이템 가격 인라인 입력
- 기존 아이템 가격 CSV에서 자동 업데이트
- 코드 벌크 삽입 시 1000건 청크 처리

### 3. 코드 관리 (`/codes`)
- 게임/컬렉션/아이템/상태/담당자 필터 + 코드 검색
- 페이지네이션 (20건), 상태 변경, CSV 내보내기

### 4. 재고 현황 (`/inventory`)
- 전체/게임별 탭 + 기간 설정
- KPI 카드 4개: 전체 코드, 판매 수, 매출($), 판매율(%)
- 매출 TOP 8 차트 (컬렉션별/아이템별), 상태 분포 원형 차트
- 게임 → 컬렉션 아코디언 → 아이템 카드 (3단 계층, 매출순)
- 만료 임박 D-day 배지

### 5. 카탈로그 관리 (`/catalog`)
- 게임 테이블: 인라인 CRUD
- 컬렉션 카드: 썸네일 이미지 (base64), 3/4/6 그리드
- 아이템 테이블: 가격/가용재고/판매(판매율)/매출/만료일, 인라인 수정

### 6. 관리자 설정 (`/settings`)
- 관리자 CRUD, 역할(admin/manager), 활성 상태 토글

---

## API 라우트

| 엔드포인트 | 메서드 | 데이터소스 |
|-----------|--------|-----------|
| `/api/games` | GET, POST, PATCH, DELETE | Supabase `games` |
| `/api/collections` | GET, POST, PATCH, DELETE | Supabase `collections` |
| `/api/items` | GET, POST, PATCH, DELETE | Supabase `items` (game_id → collections 조인) |
| `/api/codes` | GET, PATCH | Supabase `codes` (복합 필터링 + 페이지네이션) |
| `/api/codes/webhook` | POST | Supabase `codes` (코드값 exact match → 상태 업데이트) |
| `/api/upload` | POST | Supabase `items` + `upload_batches` + `codes` (벌크) |
| `/api/inventory` | GET | Supabase 4테이블 조인 → JS 집계 |
| `/api/expiry-alerts` | GET | Supabase `codes` (expires_at ≤ threshold) |
| `/api/batches` | GET | Supabase `upload_batches` |
| `/api/admins` | GET, POST, PATCH | Supabase `admins` |

---

## 핵심 타입 (`src/lib/types.ts`)

| 타입 | 설명 |
|------|------|
| `Game`, `Collection`, `Item`, `Code`, `Admin`, `UploadBatch` | 핵심 엔티티 (DB 테이블 1:1) |
| `CodeStatus` | `received → registered → sold` |
| `CollectionMetrics`, `InventoryMetrics` | 3단 계층 매출/판매율 집계 |
| `ExpiryAlert` | 만료 임박 정보 |
| `ParsedItemGroup`, `MultiItemUploadResult` | CSV 멀티아이템 업로드 |

---

## 보강 필요 항목

### P0 — 안전장치
| 항목 | 설명 |
|------|------|
| 삭제 확인 다이얼로그 | 게임/컬렉션/아이템 삭제 시 확인 팝업 |
| 상태 변경 확인 | 코드 상태 변경(특히 sold) 전 확인 |
| 업로드 실패 처리 | API 실패 시 에러 메시지 표시 |
| 가격 덮어쓰기 경고 | 기존 가격과 CSV 가격 차이 시 경고 |

### P1 — 운영 효율
| 항목 | 설명 |
|------|------|
| 코드 일괄 상태 변경 | 체크박스 선택 → 일괄 처리 |
| 업로드 후 코드 보기 | 결과 화면 → 코드 목록 링크 |
| 성공/실패 토스트 | CRUD 작업 후 피드백 |
| 로딩 상태 | API 호출 중 스피너/비활성화 |

### P2 — 정보 보강
| 항목 | 설명 |
|------|------|
| 코드 배치 정보 표시 | 업로드일/배치명 추적 |
| 재고 임계치 설정 | 관리자 설정에서 변경 가능 |
| URL 상태 반영 | 필터 상태 북마크/공유 |

### P3 — 데이터 모델 완성
| 항목 | 설명 |
|------|------|
| `redeemed` 상태 UI 추가 | DB에는 이미 존재, 프론트 반영 필요 |
| 컬렉션 이미지 Storage | base64 → Supabase Storage 마이그레이션 |
