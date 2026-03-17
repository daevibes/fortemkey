# ForTem 코드 관리 대시보드 - 프로젝트 가이드

## 프로젝트 개요
- **목적**: 게임사로부터 수령한 Redeem Code를 관리하고 마켓플레이스에 등록하는 내부 운영 툴
- **유형**: Next.js (App Router) 기반 웹 대시보드

## 기술 스택
- **프레임워크**: Next.js 16 (App Router, TypeScript)
- **스타일링**: Tailwind CSS v4 + shadcn/ui 패턴의 커스텀 컴포넌트
- **DB**: Supabase (PostgreSQL) — 현재 인메모리 Store로 데모 동작
- **CSV 파싱**: Papa Parse
- **차트**: Recharts
- **아이콘**: Lucide React
- **배포 대상**: Vercel

## 프로젝트 구조
```
src/
├── app/                    # Next.js App Router 페이지
│   ├── page.tsx            # 메인 대시보드 (/)
│   ├── upload/page.tsx     # CSV 업로드 (/upload)
│   ├── codes/page.tsx      # 코드 관리 (/codes)
│   ├── inventory/page.tsx  # 재고 현황 (/inventory)
│   ├── settings/page.tsx   # 관리자 설정 (/settings)
│   └── api/                # API 라우트
│       ├── games/route.ts
│       ├── items/route.ts
│       ├── codes/route.ts
│       ├── upload/route.ts
│       ├── batches/route.ts
│       ├── inventory/route.ts
│       └── admins/route.ts
├── components/
│   ├── ui/                 # 재사용 UI 컴포넌트 (button, card, input, badge, select)
│   └── layout/
│       └── sidebar.tsx     # 사이드바 네비게이션
└── lib/
    ├── types.ts            # TypeScript 타입 정의
    ├── utils.ts            # cn(), formatNumber(), formatDate() 유틸
    ├── store.ts            # 인메모리 데이터 스토어 (Supabase 연동 전 데모용)
    └── supabase.ts         # Supabase 클라이언트
```

## 핵심 개념
- **코드 상태 흐름**: `received(대기)` → `registered(등록)` → `sold(판매)` → `redeemed(사용완료)`
- **인메모리 Store**: `src/lib/store.ts`에 데모 데이터 포함. Supabase 연동 시 API 라우트만 수정하면 됨
- **DB 스키마**: `supabase-schema.sql` 파일 참조

## 코딩 컨벤션
- 모든 페이지는 `"use client"` (클라이언트 컴포넌트)
- API 호출은 Next.js Route Handlers (`/api/*`)를 통해 처리
- UI 컴포넌트는 shadcn/ui 패턴 (cva + cn + forwardRef)
- 한국어 UI, 날짜 포맷은 `ko-KR`

## 디자인 원칙
- **디자인 레퍼런스**: Supabase Dashboard Classic Dark 모드
- 다크 테마: `#171717` 배경, `#232323`~`#2a2a2a` 서피스, `#2e2e2e`~`#333` 보더
- 텍스트: `#ededed` (primary), `#a0a0a0` (secondary), `#666` (muted)
- 상태 Badge: 다크 배경에 맞는 저채도 톤 (`bg-*-900/30 text-*-400`)
- 색상: neutral 계열 기본, 상태별 색상 코드 (`types.ts`의 `STATUS_COLORS`)
- 반응형: `sm:`, `lg:` 브레이크포인트 활용
- 프론트엔드 디자인 작업 시 스크린샷 기반 피드백 우선 적용
- **디자인 작업 시 반드시 `frontend-design` 스킬 참고** (`.claude/skills/frontend-design/SKILL.md`)
  - 제네릭한 AI 스타일 지양, 의도적이고 일관된 미학 적용
  - 타이포그래피, 색상, 모션, 공간 구성에 세심한 주의

## 명령어
- `npm run dev` — 개발 서버
- `npm run build` — 프로덕션 빌드
- `npm run lint` — ESLint 실행

## Supabase 연동 방법
1. Supabase 프로젝트 생성
2. `supabase-schema.sql` 실행하여 테이블 생성
3. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
4. API 라우트에서 `getStore()` 호출을 Supabase 쿼리로 교체
