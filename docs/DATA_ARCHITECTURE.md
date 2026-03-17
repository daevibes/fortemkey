# ForTem 데이터 아키텍처

## 엔티티 관계도

```
Game (1) ──→ (N) Collection (1) ──→ (N) Item (1) ──→ (N) Code
                                                          │
                                                          └── UploadBatch (N:1)
Admin ──→ UploadBatch
```

## 엔티티 정의

### Game
게임사로부터 코드를 수령하는 게임 단위.

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| name | string | 게임명 |
| publisher | string | 퍼블리셔 |
| created_at | string | 생성일 |

### Collection
같은 게임 내에서 프로모션/시즌 등으로 아이템을 묶는 단위.

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| game_id | number | FK → Game |
| name | string | 컬렉션명 (예: "서머 2026 특별관") |
| description | string | 설명 |
| created_at | string | 생성일 |

### Item
실제 판매되는 디지털 상품 단위.

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| collection_id | number | FK → Collection |
| name | string | 아이템명 |
| description | string | 설명 |
| price | number | 가격 (USD) |

### Code
개별 리딤 코드.

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| code | string | 코드 문자열 |
| item_id | number | FK → Item |
| status | CodeStatus | 상태 |
| batch_id | number | FK → UploadBatch |
| expires_at | string \| null | 만료일 |
| sold_at | string \| null | 판매일 |
| created_at | string | 생성일 |

### UploadBatch
CSV 업로드 단위.

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| game_id | number | 비정규화 (조회 편의) |
| item_id | number | FK → Item |
| admin_id | number | FK → Admin |
| file_name | string | 파일명 |
| total_count | number | 전체 건수 |
| valid_count | number | 유효 건수 |
| duplicate_count | number | 중복 건수 |
| error_count | number | 오류 건수 |
| uploaded_at | string | 업로드 시각 |

### Admin
운영 담당자.

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | PK |
| name | string | 이름 |
| email | string | 이메일 |
| role | "admin" \| "manager" | 역할 |
| is_active | boolean | 활성 여부 |
| created_at | string | 생성일 |

## 코드 상태 흐름

```
received (대기) → registered (등록) → sold (판매)
```

- **received**: 게임사로부터 수령, 아직 마켓에 미등록
- **registered**: 마켓플레이스에 등록 완료, 판매 대기
- **sold**: 소비자에게 판매 완료

> `redeemed` 상태는 게임사에서 사용 여부를 알려주지 않으므로 추적하지 않음.

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/games | 전체 게임 목록 |
| POST | /api/games | 게임 추가 |
| PATCH | /api/games | 게임 수정 |
| DELETE | /api/games | 게임 삭제 (컬렉션 있으면 불가) |
| GET | /api/collections | 컬렉션 목록 (game_id 필터) |
| POST | /api/collections | 컬렉션 추가 |
| PATCH | /api/collections | 컬렉션 수정 |
| DELETE | /api/collections | 컬렉션 삭제 (아이템 있으면 불가) |
| GET | /api/items | 아이템 목록 (collection_id 필터) |
| POST | /api/items | 아이템 추가 |
| PATCH | /api/items | 아이템 수정 |
| DELETE | /api/items | 아이템 삭제 (코드 있으면 불가) |
| GET | /api/codes | 코드 목록 (필터/페이징) |
| PATCH | /api/codes | 코드 상태 전환 |
| POST | /api/upload | CSV 업로드 |
| GET | /api/batches | 업로드 배치 목록 |
| GET | /api/inventory | 재고 요약 |
| GET | /api/admins | 관리자 목록 |

## 데이터 흐름

1. **카탈로그 설정**: 게임 등록 → 컬렉션 생성 → 아이템 등록
2. **코드 업로드**: 게임 → 컬렉션 → 아이템 선택 후 CSV 업로드 → 코드 `received` 상태로 저장
3. **마켓 등록**: 코드 상태를 `registered`로 전환
4. **판매 처리**: 코드 상태를 `sold`로 전환
5. **재고 모니터링**: 대시보드에서 아이템별 대기/등록/판매 현황 확인
