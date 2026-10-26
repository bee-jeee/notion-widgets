# notion-widgets

노션 DAILY BOARD에 임베드하는 파스텔 하늘 톤 위젯.
위젯 HTML(정적) + Vercel 서버리스 API(`/api`)가 노션 DB를 읽어 보여줌.

```
노션 DB ──(NOTION_TOKEN, 서버에만)──▶ /api/*.js ──(JSON, 60s 캐시)──▶ 위젯 HTML ──▶ 노션 임베드
```

## 구성

| 파일 | 역할 | 데이터 |
|---|---|---|
| `date.html` | 날짜 카드 | 브라우저 시계 |
| `timer.html` | 지금 블록 · 남은 시간 · 하루 타임라인 | `/api/blocks` ← 타임 블록 DB |
| `dday.html` | D-day 목록 | `/api/ddays` ← D-day DB (`?items=`로 수동 지정도 가능) |
| `days.html` | 날짜 페이지 카드 목록 (누르면 새 탭) | `/api/days` ← 데일리 DB |
| `bookmark.html` | 북마크 | 파일 안 `LINKS` 배열 |
| `lib/notion.js` | 노션 호출 · 속성 파싱 · 접근키 · 캐시 공통 처리 | |
| `index.html` | 전체 미리보기 | |

- 노션 API 버전: `2026-03-11`, 조회는 `POST /v1/data_sources/{id}/query`
- "오늘"은 서버가 아니라 **브라우저 시계**로 판단 (서버 리전/시간대 영향 없음)
- `/api/days`는 회고 텍스트를 내보내지 않음 (날짜 · 컨디션 · 목표 · 코어타임 · 링크만)

## 1. 노션 통합 준비

1. https://www.notion.so/my-integrations → 새 통합 (내부), 기능은 **콘텐츠 읽기**만
2. 시크릿 복사 → 아래 `NOTION_TOKEN`에 사용
3. 노션에서 DAILY BOARD 페이지 ··· → **연결** → 방금 만든 통합 추가
   (하위의 데일리 · 타임 블록 · 작업 로그 · D-day DB까지 한 번에 권한이 생김)

## 2. Vercel 배포

1. 이 레포를 GitHub에 push
2. vercel.com → Add New → Project → 이 레포 Import (Framework: Other, 설정 그대로)
3. Settings → Environment Variables

   | 이름 | 값 |
   |---|---|
   | `NOTION_TOKEN` | 노션 통합 시크릿 |
   | `WIDGET_KEY` | 아무 긴 랜덤 문자열 (예: `openssl rand -hex 16`) |

   DB ID는 `lib/notion.js`에 기본값이 들어 있어서 따로 안 넣어도 됨
   (바꾸려면 `BLOCKS_DS`, `DAILY_DS`, `DDAY_DS`)
4. 환경변수 저장 후 Deployments → 최신 배포 ··· → **Redeploy**
5. 확인: `https://<프로젝트>.vercel.app/api/blocks?key=<WIDGET_KEY>` 가 JSON을 주면 성공

## 3. 노션 임베드 주소

모든 위젯 주소 뒤에 `?key=<WIDGET_KEY>`를 붙임.

```
https://<프로젝트>.vercel.app/timer.html?key=...
https://<프로젝트>.vercel.app/dday.html?key=...
https://<프로젝트>.vercel.app/days.html?key=...
https://<프로젝트>.vercel.app/date.html
https://<프로젝트>.vercel.app/bookmark.html
```

권장 높이: date · dday 230px / timer 330px / bookmark 360px / days 300px

## 노션 DB 규칙 (위젯이 읽는 속성)

- **타임 블록**: `블록`(제목) `시작`·`끝`(`HH:MM` 텍스트) `요일`(월~일 다중 선택) `활성`(체크) `분류` `지금까지` `다음 할 일`
  - `활성` 체크 + 시간 형식이 맞는 블록만 표시
- **D-day**: `이름` `날짜` `표시`(체크) — 표시 체크된 것만 날짜순
- **데일리**: `날짜`가 있는 페이지만, 최근 14개

노션에서 수정하면 최대 1분(캐시) + 위젯 새로고침 주기(타이머 5분, days 5분, D-day 10분) 안에 반영.
바로 보고 싶으면 노션 페이지 새로고침.

## 문제 해결

| 증상 | 원인 |
|---|---|
| 위젯에 "노션 연결 실패" | 토큰 오류, 통합이 페이지에 연결 안 됨, 또는 키 불일치 |
| `/api/...`가 401 | 주소의 `?key=`가 `WIDGET_KEY`와 다름 |
| `/api/...`가 502 | 노션 호출 실패 → Vercel 대시보드 Logs에서 원인 확인 |
| 블록이 안 보임 | `활성` 해제, 요일 미포함, 시작/끝이 `HH:MM` 아님 |
