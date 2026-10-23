# BYTE BACK 자료실 · 12단계 탈환 작전실

이 저장소는 단계별 웹 방어 실습 프로젝트입니다. 자료는 학습용 가상 데이터만 사용합니다. 실제 개인정보, 비밀번호, 토큰, 비밀키를 코드나 Git에 넣지 마세요.

현재 단계는 `aleph.config.json`의 12단계입니다. 아래의 1단계 배포 안내는 당시의 기록이며, 현재 설치·실행·중지·복구 방법은 문서 끝의 **12단계 저장점**을 따릅니다. 화면의 성공 문구와 로컬 가상 시험은 운영 심판의 통과 증거가 아닙니다.

## 4차 학생 앱 CHRONEX · 21단계 문서

같은 저장소의 `on-client/`는 13~22단계용 **별도 로컬 앱**이다. 이 README의 12단계 설정·Vercel 배포 명령을 CHRONEX 실행 명령과 섞지 않는다. CHRONEX는 본인의 로그인 상태, 업무 앱 한 개의 접속 판정, 보안 기록, AI 설명·조치 상태, 설치 패키지 조회 결과를 구분해 보여 준다. 학생이 작성한 부분은 `on-client/student/extension.mjs`의 표시 함수이며, 메뉴·API·연결·취소 처리는 제공 `on-client/public/`·`on-client/src/` 코드가 담당한다. 기존 SDP/XDR 시스템과 AI 게이트웨이는 별도 설정·권한이 있어야 연결된다.

`on-client/package.json`은 시작 틀 버전 `0.2.14`와 수업 기준 Node.js `24.19.0`을 명시한다. Windows 시작 도구는 Node.js 22~24를 허용하며, 이 PC에서는 `v24.22.0`을 확인했다. 작업 폴더, 실제 실행 명령과 브라우저 주소, 텍스트 구성도, 오류 대응, **확인한 것과 미확인(UNV)**의 구분은 [CHRONEX 학생 실행 설명서](on-client/docs/STUDENT_RUNBOOK.md)에 있다. 로컬 서버 HTTP 응답은 실제 로그인·SDP·AI·OSV 연결 성공이나 21단계 공식 통과를 증명하지 않는다.

## 12단계 재제출 기준 — 출처와 재현 절차

이 절은 **검사한 커밋의 동작을 재현하기 위한 안내**다. 12단계 기능을 추가하기 전 기준 커밋은 `0d23c3b87347`이다. 이 기준에서 시작해 `codespace-recovery`의 검사할 최신 커밋을 받은 뒤 `git rev-parse HEAD`의 **전체 SHA**를 기록하고, 그 하나의 커밋으로 설치·실행·점검·제출을 이어 간다. 서로 다른 커밋의 응답을 한 제출 기록으로 합치지 않는다.

### 코드의 출처

| 출처 | 구성 요소와 역할 |
|---|---|
| **학생 직접 제작** | `src/decider.mjs` 판정기 규칙(`device_registered`, `step_up_required`, `resource_zone`), `src/detect.mjs` 탐지·회수 **제안** 규칙 |
| **학생 직접 제작** | `public/index.html` 접속 앱·작전실, `api/device/*` 기기 인증, `api/notes.js` 보호 자료실, `api/operations.js` 가린 상태 API |
| **과제 제공: ALEPH SDP 엔진** | 신원·기기 확인과 판정 요청 전달, 엔진 측 회수 집행, 41종 공격 평가의 제공 주체. 학생이 구현한 코드가 아니며 학생 화면의 통과 표시와 구분됨 |
| **외부 서비스** | Supabase는 인증·자료 저장, Vercel은 서버 실행·배포를 담당하며 ALEPH SDP 엔진을 대신하지 않음 |

### 재현 순서: 설치 → 실행 → 중지 → 복구

1. **설치(검사할 커밋 고정):** 새 폴더에서 아래 명령을 실행하고 `git rev-parse HEAD`의 값을 점검 기록에 보존한다. 같은 결과를 다시 얻으려면 해당 전체 SHA로 `git checkout --detach <기록한-SHA>` 한 뒤 설치한다.

   ```powershell
   git clone --branch codespace-recovery https://github.com/cs48249762dkdkl-ops/choi-bujang-secret-vault.git
   cd choi-bujang-secret-vault
   git rev-parse HEAD
   npm.cmd install
   ```

2. **실행·검사:** `npm.cmd run build -- --local`, `node --test test/*.test.mjs`, `npm.cmd run test:webauthn`, `npm.cmd run decider:test`, `npm.cmd run detect:test`로 로컬 코드를 검사한다. 저장점으로 커밋한 뒤, 작업 폴더가 깨끗한 상태에서 `npm.cmd run bundle`을 실행한다. 현재 12단계 두 사례의 요청은 심판 기록에서 확인되지 않았으므로 묶음의 `observed`는 각각 `not_run`이다. 빌드·묶음 생성 성공은 실제 승인 기기의 API 동작이나 ALEPH SDP 엔진의 41종 결과를 입증하지 않는다. 서버를 로컬에서 시험할 때만 본인 Vercel 프로젝트에 연결해 `npx vercel dev`를 실행한다. Production 환경변수는 Vercel 비밀 설정으로만 관리하고, 실제 값을 터미널 출력·README·Git·제출 묶음에 넣지 않는다.

3. **중지:** 실행 중인 `npx vercel dev` 터미널에서 `Ctrl+C`를 누른다. 운영 서버는 Vercel Deployments에서 필요한 경우 해당 배포의 상태와 롤백 대상을 검토한다. 데이터베이스·운영 기록은 삭제하지 않는다.

4. **복구:** 먼저 `git status --short`와 `git diff`로 로컬 변경을 확인한다. 코드 복귀가 필요하면 위에서 기록한 정상 동작 커밋과 현재 커밋을 `git diff <정상-SHA> HEAD -- src/attack-check.mjs README.md`로 대조하고, 보존해야 할 작업을 확인한 뒤 선택한 파일 또는 해당 커밋만 안전하게 되돌린다. `git reset --hard`와 `git clean`을 사용하지 않는다. 검증된 침해 전 백업이 없으므로 정책·메모의 실제 복원은 **미실행**으로 유지하고 `/api/notes/restore`의 차단 상태를 해제하지 않는다.

### 12단계 제출 기록의 상태 해석

심판 기록에 `anonymous_static_note_read`와 `anonymous_notes_api_read`의 요청이 확인되지 않았다. 따라서 이번 12단계 제출의 두 `attackAttempts[].observed`는 `not_run`이다. 별도로 확인한 배포 주소의 HTTP 404·401은 이 사례들의 심판 요청·응답이 아니므로 제출 결과에 옮기지 않는다. 이후 심판 사례와 실제 요청이 연결되면 그 사례의 실제 HTTP 상태만 기록한다. 1~11단계의 미실행 시험과 ALEPH SDP 엔진의 41종 결과도 성공 수로 간주하지 않는다.

작업 폴더가 깨끗한 상태에서 `npm.cmd run bundle`을 실행해 `artifacts/submission.json`을 재생성하고 두 `attackAttempts[].observed`가 `not_run`인지 검사한다. 제출 화면에는 학생 제작물과 **ALEPH SDP 엔진**의 출처를 분리해 적는다. 비밀키·토큰·메모 본문을 기록하지 않는다.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 확인할 수 있습니다. 현재 메모 API는 로그인 토큰을 검증하며, Production의 `/data.json`은 공개되지 않습니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 현재 메모 확인은 로그인 토큰을 검증하는 `/api/notes` API를 기준으로 하며, 비로그인 요청은 허용되지 않습니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 공개 파일에 메모를 포함하지 않고, 서버 API와 소유권 검사를 통해 자료를 보호합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.


## Stage 2~4 저장점

### 현재 구현 및 확인 상태

- 공개 메모 화면은 서버 API `/api/notes`를 사용합니다.
- Supabase `learning_notes` 테이블은 `owner_id`를 사용합니다.
- 로그인 토큰 검증 후 사용자 ID를 기준으로 메모 접근을 제한합니다.
- 개별 메모 GET·PUT·DELETE의 소유권 필터는 커밋 `c1edd83`에 포함되어 있습니다.
- 이전 확인에서 비로그인 API 요청은 `401 LOGIN_REQUIRED`, Production의 `/data.json`은 `404 Not Found`를 반환했습니다.

### 아직 확인이 필요한 항목

- 두 계정으로 서로의 메모를 조회·수정·삭제할 수 없는지 교차 계정 테스트가 필요합니다.
- 실제 사용자 JWT로 Supabase RLS 정책을 검증해야 합니다.
- 로컬 빌드 성공은 Production 배포나 심판 판정을 증명하지 않습니다.
- Production의 `/` 및 `/aleph.json` 보안 헤더는 다시 확인해야 합니다.

### 로컬 검사

아래 검사는 로컬 코드 검사이며 Production 검증을 대신하지 않습니다.

```bash
node --check api/notes.js
git diff --check
npm run build -- --local
```

### 과거 공개 자료

현재 `/data.json`이 404를 반환하더라도 GitHub의 과거 공개 기록까지 삭제된 것은 아닙니다.

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://choi-bujang-secret-vault-rust.vercel.app/data.json
git fetch origin main
git grep -n -F '실습용 가상' origin/main
```

검색 결과에 과거 공개 메모가 나타나면 현재 API의 소유권 검사와 별도로 관리해야 합니다.

## 6단계 저장점 — 등록 기기 확인

- `src/decider.mjs`는 엔진이 제공하는 `request.deviceRegistered` 값을 확인한다.
- 등록된 기기의 정상 요청은 허용한다.
- 미등록 기기의 요청은 `device_not_registered` 사유로 거부한다.
- 최근 위험 신호가 감지되면 추가 인증 여부도 확인한다.
- 판정 결과는 `schema`, `requestId`, `decision`, `reasonCode`, `ruleIds`의 다섯 필드로 반환한다.

### 검증 방법

```bash
npm run decider:test
```

가상 요청 테스트에서 등록 기기, 미등록 기기, 복합 이상 접속, 추가 인증 후 복합 이상 접속을 확인한다. 이 테스트 결과는 실제 심판 통과 증거가 아니다.

## 7단계 저장점 — 복합 이상 접속 재확인

- 등록 기기 여부는 엔진이 제공하는 `request.deviceRegistered` 값으로 확인한다.
- 이례적인 시간대, 비정상 네트워크, 최근 60초 이내 20건 이상의 위험 신호가 모두 충족되면 추가 인증을 요구한다.
- 지역 신호만 다른 경우에는 차단하지 않는다.
- 추가 인증이 확인되고 인증 경과 시간이 900초 이내이면 복합 이상 접속 규칙의 재확인을 통과한다.
- 현재 요청 계약에는 동일 사용자의 실제 재로그인 시각을 확인할 필드가 없어 실제 로그인 이력 기반 차단은 구현하지 않았다.
- 검증은 가상 요청 테스트이며 실제 심판 통과나 운영 환경 동작을 증명하지 않는다.

### 검증 방법

```bash
npm run decider:test
npm run fixture:7
```

## 8단계 저장점 — 자료 구역 접근 제한

- `src/decider.mjs`에 `resource_zone` 규칙을 추가했다.
- 서비스 메모의 허용 경로와 GET 요청 형식을 확인한다.
- 허용 범위를 벗어난 요청은 기존 판정 응답 형식을 유지하며 거부한다.
- 이 규칙의 존재만으로 API 전체의 사용자별 소유권 검증이 증명되는 것은 아니다.

## 9단계 저장점 — 폭주 조회 탐지

- `src/detect.mjs`의 `detect(events)`는 `at`, `method`, `identity.sub`만 사용한다.
- 동일한 사용자 주체의 GET 요청이 10분 이내 120건을 초과하면 `propose_revocation`을 제안한다.
- 120건 이하, 서로 다른 사용자, 10분을 벗어난 요청은 이 규칙만으로 회수 제안을 하지 않는다.
- 의심 결과는 `action`, `reasonCode`, `subject`를 반환하며 정상 결과는 `action: "observe"`만 반환한다.
- `npm run detect:test`에서 정상 조회, 120건, 121건, 폭주 조회, 사용자 분리, 분산 조회 등 6개 테스트가 통과했다.
- 이 결과는 가상 사건에 대한 로컬 테스트이며 실제 세션 회수, 접속 차단 또는 심판 통과를 증명하지 않는다.

### 9단계 로컬 검사

```bash
npm run detect:test
git diff --check
```

## 10단계 제작 1 — 백업 검증 상태

- 저장소와 Git 이력을 확인했지만, 침해 전 검증된 정책 백업을 찾지 못했다.
- `package/baseline-functions.json`은 정책 백업이 아니므로 복원 기준으로 사용하지 않는다.
- 과거 정책 버전은 존재하지만 안전한 복원 기준이라는 출처와 무결성 증거가 확인되지 않았다.
- 정책 비교와 복원은 실행하지 않았다.
- 기존 판정 규칙, API, 데이터베이스 및 `aleph.config.json`은 변경하지 않았다.
- 다음 단계 전에 과제에서 제공한 검증된 백업과 검증 방법을 확인해야 한다.

### 10단계 제작 2 — 검증 코드 테스트 결과

- 가상 자료를 이용한 ID, 소유자, 내용 해시 비교 테스트 5개가 통과했다.
- 기존 판정·탐지·R5·패키지 테스트도 통과했다.
- 이 테스트는 검증 함수의 동작만 확인하며, 백업의 출처나 침공 전 무결성을 증명하지 않는다.
- 검증된 백업이 확보되지 않아 실제 정책·노트 복원과 복구 API 구현은 보류한다.

### 10단계 제작 3 — 복구 재개 조건

- 현재 확인 가능한 저장소에서 침공 전 안전성이 검증된 정책 백업을 찾지 못했다.
- 백업 원본의 출처, 생성 시점, 무결성을 독립적으로 확인할 수 있는 증거가 확보되기 전에는 정책을 복원하지 않는다.
- 노트 복구는 백업 노트의 ID, 소유자, 내용 해시가 신뢰할 수 있는 사전 생성 매니페스트와 일치하는 경우에만 진행한다.
- 복구 기능 구현 전에는 대상 노트 한 건만 복구하고 다른 노트와 감사 기록을 보존하는 절차를 설계한다.
- 복구 API는 로그인 검증, 소유권 확인, 요청 확인 및 실패 시 안전한 처리를 포함해야 한다.
- 테스트 계정 B의 다른 사용자 자료 접근 거부와 계정 A의 정상 접근을 검증하기 전에는 복구 성공으로 기록하지 않는다.
- 백업과 검증 방법이 확보되지 않아 실제 정책 복원, 노트 복구, 운영 환경 검증 및 심판 제출은 아직 실행하지 않았다.

### 10단계 제작 4 — 복원 API 안전 차단

- `POST /api/notes/restore` 경로를 설정에 등록했다.
- `api/notes/restore.js`는 현재 검증된 백업이 없으므로 복원을 차단하고 HTTP 503을 반환한다.
- POST 이외의 요청은 HTTP 405로 거부한다.
- `src/restore-control.mjs`는 백업 검증과 독립적인 신뢰 확인이 성공해도 실제 복원을 실행하지 않는다.
- 복원 API 테스트 2개와 복원 제어·미리보기·검증 테스트 15개가 통과했다.
- 총 17개 테스트가 통과했으며 실패는 0개다.
- 테스트 결과는 로컬 코드 동작만 확인하며 운영 환경의 복원이나 심판 통과를 증명하지 않는다.
- 검증된 백업과 복원 후 검증 절차가 확보될 때까지 실제 복원과 운영 환경 재시험은 보류한다.

### 10단계 제작 5 — 복원 절차 및 재시험 기준

#### 절차 1. 정책 사본 재검증 및 복원 전 중단 조건

1. 복원 전에 정책 사본의 파일 존재 여부를 확인하고, 사본을 다시 읽어 내용과 무결성을 검증한다.
2. 검증 결과를 확인한 뒤 복원 대상의 버전과 변경 범위를 실행 전에 표시한다.
3. 정책 사본이 없거나 재검증에 실패하면 즉시 중단한다. 검증되지 않은 사본으로 복원하지 않으며 실제 운영 정책은 변경하지 않는다.
4. 현재 검증된 침해 전 백업과 독립적인 신뢰 근거가 확보되지 않았으므로 실제 복원은 보류한다.

#### 절차 2. 시험 계정 B의 메모 한 건에 대한 대조 및 보존

1. 복원 대상은 시험 계정 B의 메모 한 건으로 제한한다.
2. 복원 전 대상 메모의 ID, 소유자, 내용 해시를 기록하고 검증된 사본의 같은 메모와 대조한다.
3. 세 값이 모두 일치할 때만 복원 대상으로 인정한다. 하나라도 다르거나 확인할 수 없으면 중단한다.
4. 복원 후에도 ID, 소유자, 내용 해시를 다시 확인해 사본 및 복원 전 기록과 대조한다. 불일치하면 성공으로 판정하지 않는다.
5. 대상 메모 한 건 외의 다른 메모와 기존 감사 기록은 변경하거나 삭제하지 않고 보존한다.

#### 절차 3. 복원 후 정상·금지 요청 재시험

1. 실제 복원이 승인되고 완료된 경우에만 정상 요청이 허용되는지 재시험한다.
2. 이어서 1~9단계의 금지 요청을 다시 전송해 모두 거부되는지 확인한다.
3. 각 시험의 실행 여부와 실제 결과를 개별 기록한다. 실행하지 않은 시험은 반드시 `미실행`으로 남기며 통과·실패 결과를 추정하거나 꾸미지 않는다.
4. 현재는 검증된 침해 전 백업이 확보되지 않아 실제 복원과 복원 후 재시험을 수행하지 않았다. 따라서 정상 요청 재시험과 1~9단계 금지 요청 재시험은 모두 `미실행`이다.

## 11단계 — 서버 승인 후 기존 자료실 열기

- 자료실 화면은 처음에 닫혀 있으며, 로그인 상태에서 `/api/notes`가 성공하고 메모 응답 형식이 확인된 뒤에만 기존 화면을 연다.
- 페이지 재진입과 로그인 상태 변경 때 서버를 다시 조회한다. 서버는 기존 기기 세션과 현재 승인 상태를 검증하므로, 설치 표시나 승인 상태 조회 버튼만으로 자료를 열지 않는다.
- 로그인 뒤에는 `/api/device/status`가 HttpOnly 기기 세션과 현재 승인을 확인하기 전까지 `/api/notes`를 요청하지 않는다. 승인된 기기는 확인 성공과 자료 응답 후 기존 화면이 열리고, 미승인·만료 세션은 닫힌 채 기기 인증이 필요하다.
- 앱은 `localStorage`와 `sessionStorage`에서 기기 키 이름의 항목을 지운다. 키 값은 읽거나 출력하지 않는다. WebAuthn 개인키는 브라우저/인증기에 보관되며 앱 코드나 제출 묶음으로 내보내지 않는다.
- 제출 묶음 생성은 기기 키 필드 이름을 포함한 결과를 거부한다.
- 로컬 확인 명령: `node --test test/device-screen.test.mjs test/device-access.test.mjs test/device-approval.test.mjs test/device-session.test.mjs`

## 12단계 저장점 — 탈환 작전실

기준으로 확인한 직전 작동 커밋은 `0d23c3b`(11단계 manifest 수정)이다. 12단계는 승인된 기존 자료실을 유지하면서 `/api/operations`와 화면의 탈환 작전실을 더한다. 작전실 API는 로그인·현재 기기 세션·서버 승인 검사를 통과한 경우에만 가린 메타데이터를 반환한다. 응답과 서버 기록은 동일한 요청 ID, 확인 시각, 규칙 수 및 미실행 상태를 사용하며 메모 본문·토큰·기기 키를 포함하지 않는다. 화면은 실제 API로 확인한 기기 접근과 코드에 정의된 규칙을 구분하고, 운영 판정·탐지 사건·회수·실제 복원·41종 총공세는 결과가 없으면 `미실행` 또는 `미확인`이라고 표시한다. 복원 경로는 검증된 사본이 없어 계속 차단된다.

1~11단계의 정상·금지 요청별 기대값과 실제 결과, 요청 ID, 확인 시각을 적는 표와 절차는 [12단계 실측표](docs/STAGE12_EVIDENCE.md)에 있다. 표의 초기값은 모두 미실행이다. 가상 메모 본문이나 시험 계정 정보는 표·서버 기록·제출 묶음에 옮기지 않는다.

### 출처와 책임 범위

| 구성 | 출처와 현재 책임 |
|---|---|
| 학생 판정기 `src/decider.mjs` | 학생 코드. 계약상 규칙 `device_registered`, `step_up_required`, `resource_zone`를 구현한다. 로컬 시험 통과는 운영 집행 증거가 아니다. |
| 학생 탐지기 `src/detect.mjs` | 학생 코드. 가상 사건의 10분·120건 초과를 탐지하고 **회수를 제안**한다. 실제 사건 전달과 회수 집행은 확인되지 않았다. |
| 접속 앱과 자료실 | 학생 코드인 `public/index.html`, `api/device/*`, `api/notes*`, `api/operations.js`. 승인 세션 확인 후 자료실을 열고, 작전실에는 본문 대신 상태만 보인다. |
| ALEPH SDP 엔진 | 과제에서 제공하는 엔진. 검증된 판정 요청·사건 전달·회수 집행·41종 공격 판정의 출처는 엔진이며 학생 화면이나 로컬 테스트가 이를 대신하지 않는다. 현재 저장소에서 운영 엔진의 개별 결과 기록은 확인되지 않았다. |
| Supabase·Vercel | 각각 인증/자료 저장과 배포/API 실행 인프라. 플랫폼을 사용했다는 사실만으로 ALEPH 엔진 판정·회수·복구가 성공했다고 보지 않는다. |

### 설치·실행·중지·확인

1. 공개 저장소를 새 폴더에 받은 뒤 Node.js 22 이상에서 `npm install`을 실행한다. 잠금 파일을 함께 유지한다. 비밀값은 복사하거나 저장소·제출 묶음에 넣지 않는다.
2. `npm run build -- --local`로 공개 화면 빌드를 확인한다. 이는 로컬 화면 확인용이며 운영 API나 심판 실행이 아니다. 전체 API를 로컬에서 시험하려면 공식 Vercel 프로젝트 연결·로그인 후 `npx vercel dev`를 실행한다. 서버 설정값은 공식 비밀 입력란에 직접 설정한다. 필요한 이름은 `SUPABASE_URL`, 서버 전용 `SUPABASE_SECRET_KEY`, `DEVICE_SESSION_SECRET`이며 값은 문서에 적지 않는다.
3. 운영 배포는 검증한 커밋을 Vercel에 배포한 뒤 `/`를 열어 로그인·기기 인증을 한다. 승인된 시험 기기에서 기존 자료실과 탈환 작전실이 보이는지 확인하고, 미승인 기기의 `/api/notes` 및 `/api/operations`가 거부되는지 확인한다. Vercel Runtime Logs에서 `operations_summary`와 화면의 요청 ID·규칙 수를 대조한다. 이 커밋을 배포하지 않았다면 이 확인은 미실행이다.
4. 로컬 `vercel dev`는 터미널에서 `Ctrl+C`로 중지한다. Vercel 배포의 중지·이전 배포 복원은 해당 프로젝트의 공식 배포 화면에서 검토 후 실행한다. 실행 중인 자료실 DB를 삭제하거나 덮어쓰지 않는다.
5. 로컬 코드는 `npm run decider:test`, `npm run detect:test`, `node --test test/operations.test.mjs test/device-screen.test.mjs`로 확인한다. 이 명령은 실제 41종 공격이나 운영 회수 결과가 아니다. `npm run bundle`은 저장점 커밋 후 실행하며, 결과 JSON은 커밋하지 않는다.

### 안전한 복구 기준

복구 버전은 아직 `미확인`이다. 검증된 침해 전 백업과 독립적인 신뢰 근거가 없으므로 정책·메모의 실제 복구는 하지 않는다. `/api/notes/restore`의 코드상 응답은 `503 S10_BACKUP_UNVERIFIED`이며 운영 요청을 보내 확인하지 않았다면 실측으로 적지 않는다. 12단계 코드가 문제를 일으키면 먼저 `git status`와 `git diff`로 다른 작업을 분리하고, 직전 작동 커밋 `0d23c3b`와 이번 단계 파일만 비교한다. 되돌릴 파일과 사라질 변경을 사용자에게 보여 주고 확인을 받은 뒤 **이번 단계 파일만** 복원한다. `git reset --hard` 또는 DB 변경은 사용하지 않는다.

`aleph.config.json`의 `repoUrl`은 현재 Git origin과 일치한다. 로그인 발급자/JWKS, 운영 측이 넣은 `judgeIssuer`, 기존 자료 API 허용 경로 및 5단계 원본 API 주소는 이번 단계에서 바꾸지 않았다. `publicAppUrl`은 현재 설정된 Production 주소이지만 **12단계 변경의 배포 여부는 별도로 확인해야 한다**.

## 5단계 재제출 보완 — 브라우저 공개 키 제거

- `public/index.html`은 Supabase 브라우저 SDK, 공개 키, 원본 자료 API를 포함하지 않는다. 로그인·로그아웃·현재 로그인 확인은 같은 출처의 `/api/auth/*`만 호출한다.
- 로그인 성공 시 서버가 HttpOnly·Secure·SameSite=Strict 인증 쿠키를 설정한다. 브라우저는 토큰 값을 읽거나 저장하지 않는다.
- 메모와 기기·작전실 API는 기존의 로그인 검증·소유자·승인 기기 검사를 유지하며, 서버 인증 쿠키를 검증해 기존 화면을 연다. 심판용 Bearer 검증 경로도 유지한다.
- `aleph.config.json`의 원본 자료 HTTPS 경로, 메모 API 허용 경로와 `vercel.json`의 `nosniff` 헤더는 유지했고, 서버 인증 경로를 허용 경로에 추가했다.
- 인증 경로는 `vercel.json`에서 기존 메모 서버 함수로 연결해 Vercel Hobby의 서버 함수 수를 12개로 유지한다. 기기 승인 화면의 WebAuthn 모듈도 기존 버전으로 불러온다.
- 로컬 확인: `node --test test/*.test.mjs`, `npm run build -- --local`, `npm run bundle`을 순서대로 실행한다. 실제 계정 로그인·배포·심판 재제출은 이 저장점에서 실행하지 않았다.

## 13단계 저장점 — CHRONEX 로그인 사용자·기기·세션 표시

4차 시작 틀 0.2.14를 `on-client/`에 추가했다. 이전 1~12단계 코드와 `aleph.config.json`의 12단계 설정은 보존했다. `on-client/student/extension.mjs`의 `renderIdentity`는 전달받은 `me`·`devices`·`sessions`의 불러오는 중·정상 응답·오류를 구분하고, 사용자·기기·세션의 ID·이름·상태를 새 DOM으로 표시한다. 현재 기기·세션과 두 목록에는 한국어 상태 설명 옆에 전달받은 원래 status 코드(`noncompliant`, `expired`, `revoked` 등)를 함께 표시한다. 예제 자료·연결 없음·확인 불가 모드를 표시하며, 오류 시 이전 사용자 값을 남기지 않는다. 다른 학생 함수와 제공 UI는 시작 틀 그대로다.

앱 폴더에서 Node.js 24.19.0으로 `node --check student/extension.mjs`를 실행해 문법을 확인하고, `node src/server.mjs`로 로컬 앱을 켠 뒤 `http://127.0.0.1:5189/`의 보호 현황을 연다. 다시 불러오기로 현재 응답을 확인하고, 실행한 터미널에서 `Ctrl+C`로 중지한다. 기본 실행은 기존 서버·에이전트에 연결되지 않으므로 **연결 없음은 성공한 로그인이나 실제 신원 확인이 아니다**. 상태별 모의 입력 검사는 통과했지만 실제 계정·기기·세션 값과 13단계 공식 판정은 미확인이다.

## 14단계 저장점 — CHRONEX 업무 앱 접속 판정 표시

`on-client/student/extension.mjs`의 `renderDecision`만 구현했다. 제공 화면이 선택한 업무 앱의 `/api/access` 결과를 전달하면 요청 전·요청 중·판정 수신·요청 실패를 구분한다. 판정 수신 시 앱 ID, 한국어 판정과 원래 코드(`allow`·`deny`·`challenge`·`unknown`), 서버가 준 이유와 시각을 표시한다. 목록 밖 판정은 `unknown`으로 취급하고, 요청 실패를 접근 거부 판정으로 바꾸지 않는다. 13단계 `renderIdentity`와 제공 서버·UI·판정·인증 설정은 변경하지 않았다.

앱 폴더에서 `node --check student/extension.mjs`로 문법을 확인하고, `node src/server.mjs`로 로컬 앱을 켠 뒤 `http://127.0.0.1:5189/`의 **업무 앱**에서 앱 하나를 골라 **접속 요청**을 누른다. 화면의 학생 판정·이유·시각을 실제 응답과 비교하고 실행 터미널에서 `Ctrl+C`로 중지한다. 기본 실행은 기존 서버에 연결되지 않으므로 연결 실패를 실제 접근 거부로 해석하지 않는다. 상태별 모의 입력 검사는 통과했지만 실제 계정의 접속 판정과 14단계 공식 판정은 미확인이다.

## 15단계 저장점 — CHRONEX 본인 접속·XDR 기록

`on-client/student/extension.mjs`의 `renderEvents`만 구현했다. 전달된 본인 기록 배열을 복사해 시각 최신순으로 표시하고, 기록 종류·업무 앱·접속 상태를 받은 값 안에서 필터링한다. 각 행의 상세에는 근거·규칙과 접속·세션·기기 상태의 한국어 뜻 및 원래 코드를 구분해 표시한다. 빈 목록과 조회 오류를 구분하고, 새 자료를 그릴 때 이전 목록·상세 선택을 남기지 않는다. 실제 조회 범위는 본인의 최근 최대 40건이며 전체 직원 기록이나 실시간 전체 위협 탐지가 아니다. 조치 실행 버튼은 추가하지 않았다. 13·14단계 함수와 제공 서버·UI·인증 설정은 변경하지 않았다.

다시 확인하려면 `on-client/`에서 Node.js 24.19.0으로 `node --check student/extension.mjs`를 실행하고, `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1`로 앱을 켠다. `http://127.0.0.1:5189/`의 **보안 기록**에서 필터 적용·해제 후 건수와 행을 비교하고 상세를 열어 세 상태를 확인한다. **다시 불러오기**로 새 자료 또는 오류가 오면 이전 상세·목록이 남지 않아야 한다. 실행 터미널에서 `Ctrl+C`로 중지한다. 문법 및 모의 데이터 검사는 통과했지만 실제 계정 기록·조회 실패 화면과 15단계 공식 판정은 아직 확인하지 않았다.

## 16단계 저장점 — CHRONEX 상태·알림·도움정보

`on-client/student/extension.mjs`의 `renderStatus`는 전달받은 본인 기기·현재 세션의 불러오는 중·빈 목록·오류와 알림을 구분한다. 오류 시 사용자가 위쪽 **다시 불러오기**를 직접 누르도록 안내하며 자동 재요청하지 않는다. 제공 화면이 전달한 진단 결과에서는 `requestId`, `component`, `version`, `checkedAt`, `engine.mode`, `engine.code`만 표시하고, 학생 상태 칸의 **도움정보 복사**를 눌렀을 때만 이 여섯 항목을 복사한다. 현재 세션은 검증된 연결 한 개이며 과거 세션 전체 목록이 아니다. 15단계 `renderEvents` 상세에는 입력된 미지원 조치에 한해 비활성 `<action> 미지원` 버튼과 미집행 안내를 더했다. 실제 목록의 `supportedActions`가 비어 있으면 버튼이 없고, 조치 요청을 전송하지 않는다. 앞 단계의 다른 함수와 제공 서버·화면·인증 설정은 변경하지 않았다.

다시 확인하려면 `on-client/`에서 Node.js 24.19.0으로 `node --check student/extension.mjs`를 실행하고, `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1`로 앱을 켠다. `http://127.0.0.1:5189/`의 **보호 현황**에서 **도움정보 불러오기** 후 학생 상태 칸의 **도움정보 복사**를 직접 누르고 복사 내용에 비밀값이 없는지 확인한다. 오류 뒤 **다시 불러오기** 성공 시 이전 오류가 사라지는지 확인하고, 실행 터미널에서 `Ctrl+C`로 중지한다. 문법·모의 데이터 검사는 통과했지만 실제 계정 화면·클립보드 확인과 16단계 공식 판정은 아직 확인하지 않았다.

## 17단계 저장점 — CHRONEX 앱 내부 AI 연결 표시

`on-client/student/extension.mjs`의 `renderAiConnection`은 제공 화면이 전달한 AI 연결 점검의 전·진행 중·성공·실패를 구분한다. `test`는 시험 연결 점검, `verified`는 그 시각의 앱 권한 및 모델 응답 점검으로 표시하며, 둘 다 사건 설명 성공으로 취급하지 않는다. 안전한 오류 코드와 메시지에 따라 권한 준비·인증·접근 제한·사용량·이용 시간·요청 제한·시간 초과·네트워크·취소·모델 없음의 안내를 구분한다. `renderExplanation`은 별도로 요청한 사건 설명의 기본 성공 표식과 요약 또는 실패 및 기록 보존 문구만 표시한다. 재점검·계정 변경 때 제공 화면의 새 입력으로 이전 결과를 교체하며 학생 함수는 자동 재요청하지 않는다. 17단계 학생 구현 자체는 앞 단계 함수와 제공 서버·화면·인증 설정을 변경하지 않았다. 함께 병합된 5단계 보완은 위 별도 절에 기록한다.

다시 확인하려면 `on-client/`에서 Node.js 24.19.0으로 `node --check student/extension.mjs`를 실행하고, `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1`로 앱을 켠다. `http://127.0.0.1:5189/`에서 사용자가 직접 계정 연결 확인 후 AI 연결 승인과 **현재 API 연결 점검**을 진행한다. 모델 응답 점검만으로 보안 기록의 사건 설명이 실행됐다고 표시하지 않는지 확인하고, 완료 후 실행 터미널에서 `Ctrl+C`로 중지한다. Workbench 수업용 AI, 앱 안의 AI 설명, ALEPH 공식 과제 판정은 별개다. 문법·모의 데이터 검사는 통과했지만 실제 계정 승인·AI 요청·사건 설명 실행과 17단계 공식 판정은 미실행·미확인이다. 열쇠나 토큰은 문서·코드·커밋에 넣지 않는다.
## 보너스 xdr-01 저장점 — 무차별 로그인 공격

- `xdr/brute-force/read-alerts.mjs`는 Wazuh 모양 경보에서 시각·출발 주소·계정·규칙 수준·설명만 추려 확인용으로 출력하고, 이름이 있거나 없는 JWT·Bearer·긴 토큰 형태는 가린다. 판정 모듈은 이를 불러오지 않는다.
- `patterns.json`과 독립형 `decide.mjs`는 MITRE ATT&CK T1110 근거의 빠른 반복 실패와 여러 계정 대상 비밀번호 대입만 사용한다. `decide.mjs`는 파일·패키지·네트워크를 읽지 않는다.
- `respond.mjs`는 명확한 `block` 결과만 5분짜리 주소·계정 결합 거부 규칙으로 바꾸고, `alert`·`block`의 최소 메타데이터만 `xdr/alerts.log`에 남긴다. 기존 `src/decider.mjs` 규칙은 변경하지 않는다.
- 다시 확인: `node --test test/xdr-run.test.mjs test/brute-force.test.mjs`, 이어서 `node scripts/xdr-run.mjs brute-force`를 실행한다. 시험은 `decide.mjs` 한 파일을 빈 폴더로 복사해 불러오는 경우도 확인한다. 제출 전에는 GitHub 기본 브랜치에도 이 커밋이 있는지 확인한다. 이 저장점의 가상 경보 결과는 `block` 10건, `alert` 9건, `record` 9건이며 정상 이벤트 차단은 0건이다. 이는 로컬 가상 경보 검사이며 운영 차단·심판 통과 증거가 아니다.

## 보너스 xdr-02 저장점 — 웹 주입 공격

- `xdr/web-injection/read-alerts.mjs`는 제공된 경보의 시각·출발 주소·계정·규칙 수준·설명만 확인용으로 추리고, 출력 전에 비밀값 형태를 가린다. 원본 경보는 바꾸지 않는다.
- `patterns.json`은 [MITRE ATT&CK T1190](https://attack.mitre.org/techniques/T1190/)을 근거로 SQL 구문·스크립트 표식·반복 경로 이탈·명령 구분자와 불확실한 경보를 정리한다. 같은 상수를 맨 위에 둔 `decide.mjs`는 다른 파일·패키지·네트워크 없이 경보 한 건에 답한다. 규칙 수준 10 이상, 같은 출발 주소의 반복 8건 이상, 구체적인 주입 신호가 함께 있을 때만 `block` 후보로 삼는다.
- `respond.mjs`는 차단 후보에만 5분 만료와 근거 경보 번호가 있는 출발 주소 거부 규칙을 만든다. 알림과 차단의 최소 메타데이터만 `xdr/alerts.log`에 기록하며 기존 `src/decider.mjs`의 규칙은 변경하지 않는다.
- 다시 확인: `node --test test/web-injection-read-alerts.test.mjs test/web-injection.test.mjs`와 `node scripts/xdr-run.mjs web-injection`을 실행한다. 가상 경보 26건의 결과는 `block` 8건, `alert` 9건, `record` 9건이며 정상 이벤트 차단은 0건이다. 격리 단일 파일 시험과 로컬 실행기 검사는 운영 차단이나 심판 판정의 증거가 아니다.

## 보너스 xdr-03 저장점 — 알려진 취약점 악용

- `xdr/known-cve/read-alerts.mjs`는 제공된 경보 24건에서 시각·출발 주소·계정·규칙 수준·설명만 24줄로 추리고 비밀값 형태를 가린다. 원본 경보는 바꾸지 않는다.
- `patterns.json`은 [Apache Log4j CVE-2021-44228](https://logging.apache.org/security.html)과 [MITRE ATT&CK T1190](https://attack.mitre.org/techniques/T1190/)을 근거로 완전한 원격 JNDI 조회 구문, 명시적인 점검 도구 식별자, 미확인 경보를 구분한다. `decide.mjs`는 같은 패턴 상수를 파일 맨 위에 두고 다른 파일·패키지·네트워크 없이 계산한다. 실제 요청 필드의 완전한 구문과 높은 수준의 T1190 경보가 함께 있을 때만 차단 후보로 삼는다.
- `respond.mjs`는 다시 확인된 차단 후보에만 5분 만료와 근거 경보 번호를 담은 출발 주소 거부 규칙을 만든다. 알림·차단의 최소 메타데이터만 Git에서 제외된 `xdr/alerts.log`에 기록한다. 기존 `src/decider.mjs`와 규칙은 변경하지 않는다.
- 다시 확인: `node --test test/known-cve.test.mjs test/xdr-run.test.mjs`, 이어서 `node scripts/xdr-run.mjs known-cve`를 실행한다(`npm run xdr:run -- known-cve`와 동일). 가상 경보 결과는 `block` 8건, `alert` 8건, `record` 8건이며 정상 이벤트 차단은 0건이다. 격리 단일 파일 시험과 로컬 실행기 검사는 운영 차단이나 심판 판정의 증거가 아니다.

## 보너스 xdr-04 저장점 — 재부팅 후에도 남는 서비스·예약 작업

- 저장소의 네 번째 경보 묶음인 `persistence`를 대상으로 한다. `xdr/persistence/read-alerts.mjs`는 원본을 바꾸지 않고 경보 24건에서 시각·출발 주소·계정·규칙 수준·설명만 24줄로 추리며 비밀값 형태를 가린다.
- `patterns.json`은 [MITRE ATT&CK T1543](https://attack.mitre.org/techniques/T1543/)과 [T1053](https://attack.mitre.org/techniques/T1053/)을 근거로 서명 없는 서비스 변경, 낯선 예약 작업, 시작 항목과 예약 작업의 결합, 미확인 변경을 구분한다. `decide.mjs`는 같은 패턴 상수를 맨 위에 두고 다른 파일·패키지·네트워크 없이 경보 한 건을 판단한다.
- `respond.mjs`는 다시 확인된 명확한 차단 후보에만 5분 만료와 근거 경보 번호를 붙인 주소·계정 결합 거부 규칙을 만든다. 실제 서비스·예약 작업을 삭제하지 않으며 기존 `src/decider.mjs` 규칙도 바꾸지 않는다. 알림·차단의 최소 메타데이터만 Git에서 제외된 `xdr/alerts.log`에 기록한다.
- 다시 확인: `node --test test/persistence.test.mjs test/xdr-run.test.mjs`, 이어서 `node scripts/xdr-run.mjs persistence`를 실행한다(`npm run xdr:run -- persistence`와 동일). 가상 경보 결과는 `block` 8건, `alert` 8건, `record` 8건이며 정상 이벤트 차단은 0건이다. 이 로컬 결과는 운영 차단이나 공식 심판 판정의 증거가 아니다.

## 보너스 xdr-05 저장점 — 권한 가로채기

- `xdr/privilege/read-alerts.mjs`는 원본 경보를 바꾸지 않고 26건에서 시각·출발 주소·계정·규칙 수준·설명만 26줄로 추리며 비밀값 형태를 가린다.
- `patterns.json`은 [MITRE ATT&CK T1078](https://attack.mitre.org/techniques/T1078/)과 [T1068](https://attack.mitre.org/techniques/T1068/) 관련 경보를 바탕으로 실제 관리자 그룹 편입, 비정상 관리자 명령, 낯선 출발지의 세션 권한 변경과 미확인 단서를 구분한다. T1068 표기만으로 취약점 악용을 증명한다고 보지 않는다. `decide.mjs`는 같은 패턴을 파일 맨 위에 두고 다른 파일·패키지·네트워크 없이 경보 한 건에 답한다.
- `respond.mjs`는 명확한 차단 후보에만 5분 만료와 근거 경보 번호를 담은 주소·계정 결합 세션 거부 규칙 후보를 만든다. 같은 계정의 다른 정상 주소나 같은 주소의 다른 계정을 막지 않는다. 알림·차단의 최소 메타데이터만 Git에서 제외된 `xdr/alerts.log`에 남긴다. 실제 세션 저장소나 기존 `src/decider.mjs` 규칙은 바꾸지 않는다.
- 다시 확인: `node --test test/privilege.test.mjs test/xdr-run.test.mjs`, 이어서 `node scripts/xdr-run.mjs privilege`를 실행한다(`npm run xdr:run -- privilege`와 동일). 가상 경보 결과는 `block` 9건, `alert` 8건, `record` 9건이며 정상 이벤트 차단은 0건이다. 로컬 시험은 실제 세션 회수나 심판 판정의 증거가 아니다.

## 보너스 xdr-06 저장점 — 자료 빼돌리기

- `xdr/exfiltration/read-alerts.mjs`는 원본을 바꾸지 않고 경보 30건에서 시각·출발 주소·계정·규칙 수준·설명만 30줄로 추리며 비밀값 형태를 가린다.
- `patterns.json`은 [MITRE ATT&CK T1041](https://attack.mitre.org/techniques/T1041/)과 [T1048](https://attack.mitre.org/techniques/T1048/)을 근거로 명령 통로 전송, 반복 대량 전송, 낯선 포트·목적지, 업무 시간 밖 압축 파일 반출과 불확실한 단서를 구분한다. 50000000바이트·8회 기준은 이 수업 경보에서 정상 전송을 차단하지 않기 위한 보수적인 로컬 기준이며 ATT&CK 자체의 수치가 아니다. `decide.mjs`는 같은 패턴을 파일 맨 위 상수로 두고 다른 파일·패키지·네트워크 없이 경보 한 건에 답한다.
- `respond.mjs`는 다시 확인된 명확한 차단 후보에만 5분 만료와 근거 경보 번호를 담은 계정·출발 주소·목적지 결합 거부 규칙 후보를 만든다. 같은 목적지를 쓰는 다른 정상 계정·출발지는 막지 않는다. 알림·차단의 최소 메타데이터만 Git에서 제외된 `xdr/alerts.log`에 남긴다. 실제 네트워크 차단이나 기존 `src/decider.mjs` 규칙 변경은 하지 않는다.
- 다시 확인: `node --test test/exfiltration.test.mjs test/xdr-run.test.mjs`, 이어서 `npm run xdr:run -- exfiltration`을 실행한다. 가상 경보 결과는 `block` 10건, `alert` 10건, `record` 10건이며 정상 이벤트 차단은 0건이다. 로컬 시험은 운영 차단이나 공식 심판 판정의 증거가 아니다.

## 18단계 저장점 — CHRONEX 근거에 연결된 AI 사건 설명

`on-client/student/extension.mjs`의 `renderExplanation`만 완성했다. 설명 실패는 선택한 사건이 없어도 안전한 오류 코드·메시지와 기록 보존 안내를 먼저 표시한다. 성공일 때는 현재 사건의 근거 ID를 빠짐없이 대조한 다음 사건 ID·참고용 요약·근거 문장·규칙 글·현재 상태와 확인 불가 항목을 표시한다. 근거 부족·불일치 또는 이미 조치가 실행됐다는 응답에는 성공 속성을 붙이지 않는다. 지원 조치가 없으면 제안이 없는 까닭을 밝히고, 제안이 있어도 사람 확인이 필요하고 실행되지 않았다고 표시하며 실행 버튼은 만들지 않는다. 앞 단계 함수와 제공 화면·서버·인증 설정은 변경하지 않았다.

다시 확인하려면 `on-client/`에서 `npm.cmd run check`를 실행하고 `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1`로 앱을 켠다. `http://127.0.0.1:5189/`의 **보안 기록**에서 사건 하나를 골라, 권한이 준비된 경우에만 사용자가 설명을 한 번 요청해 사건 ID와 인용 근거 ID·글이 같은 기록의 것인지 확인한다. 다른 사건 선택·다시 불러오기·실패 시 이전 성공 표시가 남지 않아야 한다. 실행 터미널에서 `Ctrl+C`로 중지한다. 문법·모의 데이터 검사는 통과했지만 이 저장점의 실제 계정 AI 요청·유료 모델 호출·화면 확인 및 공식 18단계 판정은 실행하거나 확인하지 않았다. 비밀값은 문서나 커밋에 넣지 않는다.
