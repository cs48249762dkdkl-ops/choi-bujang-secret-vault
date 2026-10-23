# CHRONEX 학생 실행 설명서와 시스템 구성도 (21단계)

이 문서는 같은 저장소의 `on-client` 앱을 다른 사람이 실행하고, 화면의 표시와 실제 연결 결과를 구분하도록 돕는다. **CHRONEX**는 학생이 정한 Agent 이름이다. 제공 시작 틀 0.2.14의 실행 메시지와 화면 이름은 아직 **케셰브**일 수 있다. 이름이 다르다는 사실만으로 다른 앱에 연결됐다고 판단하지 않는다. 저장소 루트의 BYTE BACK(1~12단계)과 `on-client`(13~22단계)는 같은 Git 저장소의 서로 다른 실행 단위다.

## 1. 확인한 환경과 필요한 프로그램

| 항목 | 코드의 요구·지원 범위 | 이 PC에서 2026-10-23 확인한 값 |
|---|---|---|
| Node.js | `on-client/package.json`의 수업 기준 `24.19.0`; 시작 도구는 주 버전 22~24 허용 | `v24.22.0` |
| npm | 앱의 `package.json`에 외부 `dependencies`·`devDependencies`가 없음 | `11.19.1` |
| PowerShell | `tools/start-alekov.ps1`은 Windows PowerShell로 실행하며, 실행 정책 우회는 해당 호출에만 적용 | Windows PowerShell `5.1.26100.9711`, 현재 셸 PowerShell `7.6.5` |
| Git | 저장소 위치·커밋을 확인하거나 제출할 때 사용 | `2.56.0.windows.2` |
| 브라우저 | 로컬 `http://127.0.0.1:5189/`의 화면을 연다 | 실제 브라우저 메뉴 조작은 미확인 |

이 실행 순서는 Windows에서 확인했다. macOS·Linux의 시작 도구 동작은 미확인이다. `on-client`에는 별도 `package-lock.json`이 없고 외부 npm 패키지 의존성도 선언되지 않았다. 저장소 루트의 `package-lock.json`은 BYTE BACK 쪽 잠금 파일이다. CHRONEX를 켜기 위해 루트에서 `npm install`을 실행할 필요가 없으며, 이 문서는 설치하지 않은 패키지를 설치됐다고 주장하지 않는다.

## 2. 작업 위치와 파일

Git 최상위 폴더는 이 PC에서 `C:\Users\Administrator\choi-bujang-secret-vault`로 확인했다. 다른 PC에서는 저장소를 받은 실제 경로로 바꾼다.

```text
choi-bujang-secret-vault/            Git 최상위, BYTE BACK 코드와 package-lock.json
├─ README.md                          기존 1~12단계 설명과 4차 학생 앱 안내
└─ on-client/                         CHRONEX 앱 작업 폴더
   ├─ package.json                    0.2.14, start/demo/check 명령
   ├─ .env.example                    비밀 없는 설정 이름의 예시; 자동 적용되지 않음
   ├─ tools/start-alekov.ps1           Windows 실행·포트·준비 상태 확인
   ├─ src/server.mjs                   127.0.0.1 로컬 HTTP 서버와 API
   ├─ src/engine/                      제공 SDP 호스트 연결 코드
   ├─ src/ai/                          제공 AI 연결·검증 코드
   ├─ src/actions/                     제공 조치 준비·영수증·결과 코드
   ├─ src/vulnerabilities/             제공 lock/설치 메타데이터·OSV 조회 코드
   ├─ vendor/clco-http.mjs             제공 AI 게이트 전송 모듈
   ├─ public/index.html, app.js        제공 메뉴·버튼·요청·학생 함수 연결
   ├─ public/vulnerabilities-view.mjs  제공 패키지 결과 화면·응답 정규화
   ├─ student/extension.mjs            13~20단계 학생 표시 함수
   ├─ student/engine-adapter.mjs       제공 호스트 능력의 본인 범위 연결 틀
   └─ docs/STUDENT_RUNBOOK.md          이 학생 문서
```

`student/engine-adapter.mjs`가 학생 폴더에 있다고 해서 기존 SDP/XDR 시스템이나 집행기를 학생이 작성했다고 주장하지 않는다. `on-client/.env.example`은 설정 **예시**이며 서버가 자동으로 읽는 비밀 파일이 아니다. 실제 인증·AI 자격·개인 설정의 값이나 경로는 문서, 캡처, Git, 제출 원문에 넣지 않는다.

## 3. 설치·실행·중지·재실행

1. Node.js를 설치하고 **새 PowerShell 창**을 연다. 이 PC의 기존 작업을 이어받는 경우, 아래의 실제 앱 폴더에서 시작한다. 새로 받은 폴더라면 경로만 바꾼다.

   ```powershell
   Set-Location 'C:\Users\Administrator\choi-bujang-secret-vault\on-client'
   node --version
   npm.cmd --version
   ```

2. 기본 실행 명령은 다음과 같다. 이 명령은 프로젝트 밖의 사용자별 계정 연결 설정을 준비할 수 있지만, 그 자체로 로그인·SDP 연결·AI 권한을 승인하지는 않는다. 별도의 설정 원문을 문서에 복사하지 않는다.

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
   ```

   계정 연결 준비 없이 화면의 **연결 없음** 상태만 확인할 때는 같은 폴더에서 `-NoNativeHost`를 붙일 수 있다. `npm.cmd run start`도 `node src/server.mjs`로 로컬 서버를 켠다. `npm.cmd run demo`는 예제 자료이며 실제 연결 증거가 아니다.

3. 실행 도구가 `케셰브가 켜졌습니다. 브라우저에서 http://127.0.0.1:5189/ 을 여세요.`와 `서버가 응답한 것만 확인했습니다. AI 연결 상태는 화면에서 따로 확인해 주세요.`를 출력하면 **로컬 서버 응답**을 확인한 것이다. 브라우저에서 `http://127.0.0.1:5189/`를 열어 `보호 현황`, `업무 앱`, `보안 기록` 메뉴를 찾는다. 서버 시작 문구나 HTTP 200은 로그인·SDP·AI·OSV 조회의 성공 증거가 아니다.
4. 실행 중인 PowerShell 창에서 `Ctrl+C`로 중지한다. 다시 켤 때는 같은 `on-client` 폴더에서 2번 명령을 다시 실행한다. 포트 5189가 사용 중이면 다른 프로그램을 종료하지 말고 시작 도구의 `-Port 5190`을 사용하고 브라우저 주소도 `:5190`으로 바꾼다. 이미 전달된 보안 조치의 효과는 앱 화면 취소나 서버 중지로 되돌아가지 않는다.

이 PC에서 `node .\src\server.mjs`을 직접 실행해 `케셰브 연결 확인: http://127.0.0.1:5189` 출력을 보고, 별도 로컬 HTTP 요청에서 첫 화면 **200**을 받았다. 그 서버는 중지했다. `start-alekov.ps1 -NoNativeHost -Port 5199 -Background`의 자체 준비·응답 확인 문구도 관측했지만, 이 자동화 환경은 명령 종료 후 자식 프로세스를 유지하지 않았다. **기본 실행 도구의 지속 실행과 실제 브라우저 조작은 아직 확인하지 않았다.**

## 4. 글로 쓴 구성도와 데이터 흐름

```text
[브라우저: on-client/public/index.html + public/app.js
           학생 표시: on-client/student/extension.mjs]
       │ 127.0.0.1:5189 HTTP (기본 포트)
       ▼
[로컬 앱 서버: on-client/src/server.mjs]
       ├─ 설정·본인 권한이 있을 때 → [기존 접근 제어·XDR 시스템]
       │   연결 코드: on-client/src/engine/sdp-host.mjs,
       │             on-client/student/engine-adapter.mjs
       ├─ 계정·앱 AI 권한이 확인될 때 → [AI 게이트웨이/CLCO]
       │   연결 코드: on-client/src/ai/vault-service.mjs,
       │             on-client/vendor/clco-http.mjs
       └─ 프로젝트·공개 패키지 허용 범위가 있을 때 → [OSV 공개 조회]
           연결 코드: on-client/src/vulnerabilities/project-scan.mjs,
                     on-client/src/vulnerabilities/osv.mjs
           공개 조회 주소: https://api.osv.dev/v1/querybatch
```

브라우저는 제공 `public/app.js`를 통해 `/api/me`, `/api/apps`, `/api/events`, `/api/devices`, `/api/sessions`, `/api/vulnerabilities` 등을 호출한다. 앱 서버는 받은 응답을 검증·정리하고 학생 표시 함수에 전달한다. 업무 앱 하나의 판정은 `/api/access`, 사건 설명은 `/api/ai/explain`, 조치 준비·집행·결과 재조회는 `/api/actions/prepare`·`execute`·`result` 경로를 제공 코드가 다룬다. 학생 표시 함수는 요청이나 집행을 새로 만들지 않는다.

기본 실행에서 기존 SDP/XDR 시스템의 주소·권한은 제공되지 않는다. 위 연결 코드의 존재만으로 외부 시스템 접속이나 학생의 집행 권한이 입증되지 않는다. AI 게이트웨이도 별도 계정·앱 권한이 필요하며, 코딩을 돕는 AI 및 공식 단계 판정 AI와 구분한다. OSV는 승인된 공개 패키지의 정확한 설치 버전만 조회하도록 설계됐고, 설정이 없으면 `not_configured` 또는 `not_checked`가 정상적인 **미조회** 결과일 수 있다.

## 5. 제공 코드와 학생 작성 범위

| 위치 | 출처·역할 | 확인 범위 |
|---|---|---|
| `student/extension.mjs`의 `renderIdentity` | 학생 작성: 계정·기기·세션의 상태와 재조회 값 표시 | 코드 및 모의 입력 검사; 실제 다른 사용자·장애 상태 미확인 |
| `renderDecision` | 학생 작성: 선택한 앱 하나의 allow/deny/challenge/unknown, 이유·시각·실패 구분 | 코드 및 모의 입력 검사; 모든 판정의 실제 재현 미확인 |
| `renderEvents` | 학생 작성: 본인 접속·XDR 사건과 근거·규칙·상태 표시 | 코드 검사; 실제 다른 계정 사건 조회 미실행 |
| `renderStatus` | 학생 작성: 알림·기기·세션·진단의 빈 상태와 오류 표시 | 코드 검사; 실제 모든 장애 분기 미확인 |
| `renderAiConnection` | 학생 작성: AI 연결 점검·권한·실패 상태 표시 | 코드 검사; 현재 앱 AI 권한 실측 미확인 |
| `renderExplanation` | 학생 작성: 사건 근거 ID에 맞는 AI 설명과 미실행 제안 표시 | 코드 검사; 이 문서 작성 중 실제 AI 요청 미실행 |
| `renderAction` | 학생 작성: 준비·사람 확인·ACK·효과 관측·불명 상태 구분 | 모의 DOM 검사; 실제 집행 권한·효과 미확인 |
| `renderVulnerabilities` | 학생 작성: lock 해시·정확한 버전·OSV 결과·부분 실패 표시 | 모의 DOM/계약 검사; 이 문서 작성 중 실제 OSV 조회 미실행 |
| `public/`, `src/`, `vendor/`, `tools/` | 시작 틀·제공 UI, 로컬 서버와 연결·조회·조치 코드 | 학생 함수의 원천 응답·버튼·취소 처리를 제공. 학생이 수정하지 않음 |
| 기존 SDP/XDR·AI 게이트웨이·OSV | 외부 시스템 | 설정·권한·실제 응답 없이 연결 성공이나 안전을 주장하지 않음 |

13~20단계 공식 판정 통과는 사용자가 별도로 알려 준 사실이다. 위 표의 **실측**은 이 문서 작업에서 직접 실행한 항목만 뜻하며, 공식 판정이 실시간 연결·새 환경 재현을 대신하지 않는다.

## 6. 실패·미조회 때 확인할 순서

| 표시·코드 | 의미 | 사용자가 확인할 한 가지 순서 |
|---|---|---|
| `Node.js 가 없습니다` 또는 지원 밖 버전 | 시작 도구가 실행 전 중단 | Node.js 22~24 설치 후 새 PowerShell 창에서 `node --version` 확인 |
| `앱 폴더가 아닙니다` 또는 `MODULE_NOT_FOUND ... src/server.mjs` | 저장소 루트 등 잘못된 작업 위치 | `on-client`로 이동해 `package.json`과 `src/server.mjs` 존재 확인 |
| `포트 5189 를 다른 프로그램이 쓰고 있습니다` | 로컬 포트 충돌 | 다른 프로그램은 그대로 두고 `-Port 5190`, 브라우저도 `:5190` 사용 |
| `연결 없음`, `ENGINE_NOT_CONNECTED` | 앱은 켜졌지만 기존 SDP 연결이 없음 | 제공 설정을 임의로 만들지 말고 담당자가 허용한 연결 상태 확인 |
| `ENGINE_RESULT_UNVERIFIED`, `CONTRACT_MISMATCH` | 응답 형식·범위 확인 불가 | `다시 불러오기` 한 번 후에도 같으면 `도움정보 불러오기` 내용을 확인해 담당자에게 전달 |
| `ON_AI_PROVISIONING_PENDING`, `WB_CLCO_AUTH_REQUIRED` | 앱 AI 계정·권한 확인 안 됨 | 앱의 계정 연결·AI 승인 상태 확인; 키나 토큰을 붙여 넣지 않음 |
| `not_configured`, `not_checked` | 프로젝트 설정 또는 승인된 공개 조회 대상이 없음 | `설치 패키지 조회` 결과가 미조회임을 확인하고 담당자 설정을 기다림 |
| `partial`, `unverifiable`, 조회 실패 | lock·설치 메타데이터·OSV 결과가 완전히 확인되지 않음 | 받은 취약점 ID는 유지하고 실패를 안전으로 해석하지 않음; 필요하면 직접 다시 조회 |
| 조치 `pending`, `unknown` | ACK 또는 결과 불명, 효과 미확인 | 중복 집행하지 말고 제공 화면의 `연동 시스템 결과만 재조회`를 사용 |

오류 확인 중 작업 폴더나 DB를 삭제하지 않는다. `git status --short`로 기존 변경을 먼저 확인하고, 앱만 종료·재실행한다. 설정·권한·원천 시스템 문제는 비밀값 대신 안전한 도움정보를 담당자에게 전달한다. `패키지 조회 취소` 뒤 늦게 온 응답은 제공 `public/app.js`의 요청 세대 검사로 버려지도록 작성돼 있다. 이 문서 작업에서 실제 취소·재요청의 네트워크 탭은 확인하지 않았다.

## 7. 미확인과 제출 경계

- 현재 계정의 실제 SDP/XDR 연결, 사용자별 사건 범위, AI 게이트웨이 권한, 보안 조치 집행·효과, 공개 OSV 응답은 **미확인(UNV)**이다. `demo`와 `none_found`는 각각 예제·조회 범위 결과이지 실제 연결 또는 앱 전체 안전의 증거가 아니다.
- 새 빈 폴더에서 같은 최종 커밋으로 설치·실행·13~20단계 누적 동작을 확인하는 작업은 22단계에서 별도로 한다. 지금 버전을 `v1.0`으로 부르지 않는다.
- 21·22단계는 현재 과제 화면에 저장소 주소와 **실제 40자리 커밋**을 직접 적는다. 이 문서 자체는 커밋·푸시·단계 제출을 하지 않는다. 비공개 원문 JSON이 필요하면 과제 화면의 `비공개 저장소 원문 준비 방법`에서 받은 도구의 **실제 경로**와 제출 커밋을 확인한 뒤 사용한다. 도구 경로를 추측해 명령을 만들지 않는다. 원문 전달과 공식 AI 검토 통과는 별개다.
