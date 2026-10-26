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
| `dday.html` | D-day 목록, `+`로 새 D-day 추가 | `/api/ddays` ← D-day DB (`?items=`로 수동 지정도 가능) |
| `jobs.html` | 지원 현황, `+`로 새 지원 추가 | `/api/jobs` ← 지원 현황 DB |
| `days.html` | 날짜 페이지 카드 목록 (누르면 새 탭), `+`로 오늘 페이지 생성·열기 | `/api/days` ← 데일리 DB |
| `ideas.html` | 아이디어 박스 목록 + 한 줄 입력으로 바로 추가 | `/api/ideas` ← 아이디어 박스 DB |
| `coding.html` | 코테 요약 · 오늘 복습 목록 · 약한 유형, `+`로 새 기록 추가 | `/api/coding` ← 코테 기록 DB |
| `bookmark.html` | 북마크 | 파일 안 `LINKS` 배열 |
| `lib/notion.js` | 노션 호출 · 속성 파싱 · 접근키 · 캐시 · 입력 검증 공통 처리 | |
| `widget.js` | `widgetApi`(GET) / `widgetPost`(POST, JSON body) 공통 호출 헬퍼 | |
| `index.html` | 전체 미리보기 | |

- 노션 API 버전: `2026-03-11`, 조회는 `POST /v1/data_sources/{id}/query`, 생성은 `POST /v1/pages`
- "오늘"은 서버가 아니라 **브라우저 시계**로 판단 (서버 리전/시간대 영향 없음)
- `/api/days`는 회고 텍스트를 내보내지 않음 (날짜 · 컨디션 · 목표 · 코어타임 · 링크만)
- GET은 모두 읽기 전용(60s 이하 캐시), POST는 `no-store`로 즉시 반영. 각 위젯의 `+`를 누르면
  위젯 안에서 인라인 폼이 펼쳐지고(모달 없음), 저장하면 목록이 바로 새로고침됨
- `days.html`의 `+`는 폼 없이 바로 "오늘 날짜 페이지 열기": 없으면 기본 템플릿으로 생성, 있으면 그 페이지로 이동

## 1. 노션 통합 준비

1. https://www.notion.so/my-integrations → 새 통합 (내부), 기능은 **콘텐츠 읽기 · 업데이트 · 입력** 모두 켜기 (`+` 추가 기능이 페이지 생성을 함)
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
   (바꾸려면 `BLOCKS_DS`, `DAILY_DS`, `DDAY_DS`, `JOBS_DS`, `IDEAS_DS`, `CODING_DS`)
4. 환경변수 저장 후 Deployments → 최신 배포 ··· → **Redeploy**
5. 확인: `https://<프로젝트>.vercel.app/api/blocks?key=<WIDGET_KEY>` 가 JSON을 주면 성공

## 3. 노션 임베드 주소

모든 위젯 주소 뒤에 `?key=<WIDGET_KEY>`를 붙임.

```
https://<프로젝트>.vercel.app/timer.html?key=...
https://<프로젝트>.vercel.app/dday.html?key=...
https://<프로젝트>.vercel.app/jobs.html?key=...
https://<프로젝트>.vercel.app/days.html?key=...
https://<프로젝트>.vercel.app/ideas.html?key=...
https://<프로젝트>.vercel.app/coding.html?key=...
https://<프로젝트>.vercel.app/date.html
https://<프로젝트>.vercel.app/bookmark.html
```

권장 높이: date · dday 230px / timer 330px / bookmark 360px / jobs 300px / days 300px / ideas 300px / coding 230~260px

## 노션 DB 규칙 (위젯이 읽는 속성)

- **타임 블록**: `블록`(제목) `시작`·`끝`(`HH:MM` 텍스트) `요일`(월~일 다중 선택) `활성`(체크) `분류` `지금까지` `다음 할 일`
  - `활성` 체크 + 시간 형식이 맞는 블록만 표시
- **D-day**: `이름` `날짜` `표시`(체크) — 표시 체크된 것만 날짜순
- **지원 현황**: `회사`(제목) `포지션` `단계`(select) `마감일` `지원일` `공고 링크` `메모`
  - `단계` 허용값: 관심, 지원, 서류 통과, 코테/과제, 면접, 최종 합격, 불합격, 보류 (서버에서 화이트리스트 검사)
- **아이디어 박스**: `아이디어`(제목) `분류`(select) `상태`(select) `기록일`(생성 시각)
  - `분류` 허용값: 프로젝트, 블로그, 공부, 생활, 기타
  - 위젯은 `상태`가 "실행"·"버림"이 아닌 것만 최근 생성순 6개 표시, 새로 추가하면 `상태`="보관"
- **데일리**: `날짜`가 있는 페이지만, 최근 14개. 기본 템플릿이 설정돼 있어야 `+`로 생성한 페이지가 채워짐
- **코테 기록**: `문제`(제목) `플랫폼`(select) `난이도`(select) `유형`(multi_select) `결과`(select)
  `푼 날짜`(date) `링크`(url) `복습 단계`(number) `마지막 복습`(date) `메모`
  - `플랫폼` 허용값: 프로그래머스, 백준, LeetCode, 기타
  - `난이도` 허용값: Lv0~Lv5, 브론즈, 실버, 골드, 플래티넘
  - `유형` 허용값: 구현, 해시, 정렬, 스택/큐, 그리디, DFS/BFS, DP, 이분탐색, 그래프, 문자열, 기타
  - `결과` 허용값: 혼자 풂, 힌트 봄, 답 봄

노션에서 수정하면 최대 1분(캐시) + 위젯 새로고침 주기(타이머 5분, days 1분, D-day 10분, jobs 2분, ideas 5분, coding 2분) 안에 반영.
바로 보고 싶으면 노션 페이지 새로고침.

## 복습 규칙 (`coding.html`)

- 간격은 `푼 날짜` 기준 3일 → 7일 → 14일 (`복습 단계` 0, 1, 2에 대응)
- `복습 단계`가 3이면 복습 끝 (더 이상 복습 대상에 안 뜨고, `+`로 눌러도 더 안 올라감)
- 다음 복습일 = `푼 날짜 + 간격[단계]`일. **브라우저 기준 오늘**이 그 날짜 이상이면 "복습 대상"
- 밀린 복습도 계속 표시되고 다음 복습일이 가까운 순으로 정렬됨 (밀린 일수는 `+N일`로 표시)
- `✓`를 누르면 `복습 단계` +1(최대 3), `마지막 복습`=오늘로 서버에 반영
  - 서버는 `id`로 페이지를 먼저 조회해 부모가 코테 기록 DB인지 확인 후 처리 (다른 DB 페이지면 403)

## `+` 추가 기능

- 각 위젯 헤더 바 오른쪽의 `+`를 누르면 위젯 높이 안에서 폼이 펼쳐짐 (모달 없음)
- 저장 성공 시 폼이 닫히고 목록이 바로 새로고침, 실패 시 입력값을 유지하고 짧은 에러 문구만 표시
- 잘못된 입력은 `/api/...`가 `400 { error: "invalid_input", field }`로 응답
- `days.html`의 `+`는 폼이 없고 즉시 "오늘 날짜 페이지 열기": 오늘 날짜 페이지가 이미 있으면 그 페이지로,
  없으면 데일리 DB 기본 템플릿으로 새로 만들어 이동 (템플릿 내용은 노션이 비동기로 채움)

## 문제 해결

| 증상 | 원인 |
|---|---|
| 위젯에 "노션 연결 실패" | 토큰 오류, 통합이 페이지에 연결 안 됨, 또는 키 불일치 |
| `/api/...`가 401 | 주소의 `?key=`가 `WIDGET_KEY`와 다름 |
| `/api/...`가 400 | `+`로 보낸 입력이 비어있거나, 날짜 형식이 `YYYY-MM-DD`가 아니거나, select 값이 허용 목록 밖임 |
| `/api/...`가 405 | 위젯이 지원하지 않는 HTTP method로 호출됨 |
| `/api/coding`이 403 | 복습 완료 요청(`id`)이 코테 기록 DB가 아닌 다른 노션 페이지를 가리킴 |
| `/api/...`가 502 | 노션 호출 실패 → Vercel 대시보드 Logs에서 원인 확인 |
| 블록이 안 보임 | `활성` 해제, 요일 미포함, 시작/끝이 `HH:MM` 아님 |
| `+`로 만든 데일리 페이지에 템플릿 내용(연결된 DB 뷰 등)이 안 보임 | 노션이 템플릿을 비동기로 채우는 중일 수 있음. 페이지를 새로고침해서 확인 |
