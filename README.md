# BYTE BACK 방어전 시작 틀 R5

이 저장소는 단계별 웹 방어 실습 프로젝트입니다. 자료는 학습용 가상 데이터만 사용합니다. 실제 개인정보, 비밀번호, 토큰, 비밀키를 코드나 Git에 넣지 마세요.

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
