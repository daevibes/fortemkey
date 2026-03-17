# Webhook 연동 가이드

> 포템 마켓플레이스 → ForTem 코드 관리 대시보드 판매 동기화

---

## 개요

포템 마켓에서 코드가 판매되면, Webhook으로 우리 대시보드에 알려줘서 코드 상태를 자동 업데이트하는 방식.

## 엔드포인트

```
POST /api/codes/webhook
```

## 요청 형식

### 단건 (코드 1개 판매)

```json
{
  "code": "ABC-000123-XYZ"
}
```

### 다건 (코드 여러 개 동시 판매)

```json
{
  "codes": ["ABC-000123-XYZ", "ABC-000124-XYZ", "ABC-000125-XYZ"]
}
```

### 상태 지정 (기본값: sold)

```json
{
  "code": "ABC-000123-XYZ",
  "status": "redeemed"
}
```

- `sold` — 판매 완료 (기본값, status 생략 가능)
- `redeemed` — 사용 완료

## 응답 형식

```json
{
  "processed": 3,
  "success": 2,
  "failed": 1,
  "results": [
    { "code": "ABC-000123-XYZ", "success": true },
    { "code": "ABC-000124-XYZ", "success": true },
    { "code": "ABC-000125-XYZ", "success": false, "error": "코드를 찾을 수 없습니다." }
  ]
}
```

## 에러 케이스

| 상황 | 응답 |
|------|------|
| 코드 없음 | `"코드를 찾을 수 없습니다."` |
| 이미 sold 상태 | `"이미 판매 처리된 코드입니다."` |
| 잘못된 요청 | 400 Bad Request |

## 포템 개발진에게 전달할 내용

> "코드가 판매되면 아래 URL로 POST 요청 보내주세요."
>
> - **URL**: `https://{배포 도메인}/api/codes/webhook`
> - **Method**: POST
> - **Content-Type**: application/json
> - **Body**: `{ "code": "판매된 코드값" }` (다건이면 `{ "codes": [...] }`)
>
> 응답으로 처리 결과 JSON이 돌아옵니다.

## 보안 (추후 추가 예정)

현재는 인증 없이 동작. 배포 후 아래 보안 옵션 중 택1 적용 예정:

1. **API Key 헤더** — `X-Webhook-Secret: {비밀키}` 검증
2. **IP 화이트리스트** — 포템 서버 IP만 허용
3. **HMAC 서명** — 요청 본문 서명 검증

## 타임라인

| 단계 | 상태 |
|------|------|
| Webhook API 구현 | ✅ 완료 (`/api/codes/webhook`) |
| Supabase 연동 | ⬜ 진행 예정 |
| Vercel 배포 | ⬜ 진행 예정 |
| 보안 헤더 추가 | ⬜ 배포 후 |
| 포템 개발진 연동 | ⬜ 배포 후 URL 전달 |
