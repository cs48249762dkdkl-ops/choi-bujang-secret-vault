# BYTE BACK 방어전 시작 틀 R5

이 저장소는 단계별 웹 방어 실습 프로젝트입니다. 자료는 학습용 가상 데이터만 사용합니다. 실제 개인정보, 비밀번호, 토큰, 비밀키를 코드나 Git에 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

## Stage 2~4 저장점

### 현재 구현 및 확인 상태

- 공개 `public/data.json` 제공을 중단하고 `/api/notes` 서버 API를 사용합니다.
- Supabase `learning_notes` 테이블에 학습용 가상 메모와 `owner_id uuid`가 있습니다.
- 비로그인 API 요청은 `401 LOGIN_REQUIRED` JSON 응답으로 거부되는 것을 확인했습니다.
- 메모 목록 조회 및 생성·수정·삭제 API는 로그인한 사용자 ID를 기준으로 소유권을 제한합니다.
- 개별 메모 GET·PUT·DELETE에도 `owner_id` 필터를 적용하는 변경이 로컬 작업 중입니다.
- Supabase RLS가 활성화되어 있고 SELECT·INSERT·UPDATE·DELETE 정책은 `auth.uid() = owner_id`를 기준으로 설정했습니다.
- `anon` 역할에는 테이블 권한이 없고 `authenticated`에는 필요한 CRUD 권한이 설정된 것을 확인했습니다.
- `/data.json`은 Production에서 `404 Not Found`를 반환하며 `X-Content-Type-Options: nosniff` 헤더를 확인했습니다.

### 아직 완료로 단정하지 않을 항목

- 로컬의 개별 메모 소유권 필터 변경은 아직 커밋 및 Production 배포 전입니다.
- 두 계정 사이에서 다른 사용자의 메모를 조회·수정·삭제할 수 없는지 실제 교차 계정 테스트가 필요합니다.
- RLS 정책은 설정했지만 실제 사용자 JWT로 RLS를 통과하는지 검증해야 합니다.
- 로컬 빌드 성공은 Production 배포 성공이나 심판 판정을 증명하지 않습니다.

### 실행 및 확인

```bash
node --check api/notes.js
git diff --check
npm run build -- --local
```

현재 배포 파일과 GitHub 최신 파일에 이전에 공개되었던 가상 메모 문장이 남아 있는지 각각 검색합니다.

### 현재 배포 파일 검색

```bash
curl -sS https://choi-bujang-secret-vault-ea82owz9x-cs48249762dkdkl-ops.vercel.app/ | grep -F '실습용 가상'
curl -sS -o /tmp/data.json -w '%{http_code}\n' https://choi-bujang-secret-vault-ea82owz9x-cs48249762dkdkl-ops.vercel.app/data.json
### 현재 배포 파일 검색

확인 결과 현재 배포 홈페이지에서는 `실습용 가상` 문장이 검색되지 않았고, 공개 `/data.json`은 `404 Not Found`였습니다.

### GitHub 최신 파일 검색

```bash
git fetch origin main
git grep -n -F '실습용 가상' origin/main
```

확인 결과 최신 `origin/main`의 과거 공개 `data.json`에서 다음 문장이 검색되었습니다.

- `실습용 가상 과제 기록`
- `실습용 포트폴리오 기록`
- `실습용 리추얼 기록`
- `실습용 행정 기록`

따라서 현재 배포에서 자료가 보이지 않더라도 최신 GitHub 파일에는 과거 공개 자료가 남아 있습니다. 옛 공개 커밋과 옛 배포가 남아 있는 한 과거 노출이 해소됐다고 쓰지 않습니다.

### 공개 API의 남은 약점

Stage 2의 `/api/notes`는 비로그인 요청으로 호출할 수 있습니다. 서버 전용 Supabase 키는 서버 함수에만 존재하지만 자료 API 자체에는 아직 로그인 또는 사용자별 접근 제어가 없습니다.

제작 3에서는 이 공개 API 약점을 해소했다고 쓰지 않습니다.

### 최종 Production 보안 헤더 확인

Production의 `/`와 `/aleph.json` 응답에서 `X-Content-Type-Options: nosniff`가 확인되지 않았습니다. 이 항목은 충족했다고 기록하지 않습니다.
