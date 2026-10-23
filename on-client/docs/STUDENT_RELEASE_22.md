# CHRONEX 22단계 재현·인수인계 기록

이 기록은 학생의 **검증 중 버전**에 관한 것이다. 공식 22단계 AI 판정은 제출 커밋의 원문 검토이며, 서버의 실행 검증·운영 인증·v1.0 발행이 아니다.

## 버전·원본 보존

| 항목 | 기록 |
|---|---|
| 저장소·브랜치 | `https://github.com/cs48249762dkdkl-ops/choi-bujang-secret-vault.git` · `codespace-recovery` |
| 새 폴더에서 직접 실행한 커밋 | `7fa464fe771ab95bf13088d1c02ab3aa8a936f09` (21단계 문서 저장점) |
| 앱 버전 | `on-client/package.json`의 시작 틀 `0.2.14`; CHRONEX v1.0이 아님 |
| 환경·시각 | Windows, Node.js `v24.22.0`, npm `11.19.1`, 2026-10-23 16:49 KST |
| 원래 작업 폴더 | `C:\Users\Administrator\choi-bujang-secret-vault`; 추적 파일 변경 없이 미추적 `on-client/student/plan.md` 보존 |
| 독립 복제본 | 작업 공간 `outputs/chronex-stage22-7fa464f`; GitHub에서 받은 HEAD가 위 40자리와 일치, 최초 `git status --short` 비어 있음 |

이 문서 자체는 위 재현 커밋 이후 작성됐다. 제출할 최종 커밋은 이 문서에 자기 자신의 SHA를 하드코딩하지 않고, 저장 후 `git rev-parse HEAD`로 확인한다. 그 40자리로 새 빈 폴더에서 아래 절차를 반복하고 별도 확인 기록에 남긴다. 서로 다른 커밋의 결과를 한 최종 버전의 실행 성공으로 합치지 않는다. 해당 재시험 전에는 **최종 커밋 재현이 미확인(UNV)**이다.

## 이동·설치·실행 절차와 직접 관찰

다음 `REPRO_ROOT`는 프로젝트 밖의 **새 빈 폴더 경로**, `SUBMISSION_SHA`는 제출할 실제 **40자리 커밋**으로 바꾼다. `git rev-parse HEAD`가 그 값과 다르면 앱을 실행하지 않는다. 인증·설정 파일은 원래 폴더에서 복사하지 않는다.

```powershell
git clone --branch codespace-recovery --single-branch https://github.com/cs48249762dkdkl-ops/choi-bujang-secret-vault.git REPRO_ROOT
Set-Location REPRO_ROOT
git switch --detach SUBMISSION_SHA
git rev-parse HEAD
git status --short
Set-Location .\on-client
node --version
npm.cmd --version
npm.cmd install --ignore-scripts --offline --no-audit --no-fund --package-lock=false
npm.cmd run check
npm.cmd start
```

복제본에서 `src/server.mjs`, `student/extension.mjs`, `tools/start-alekov.ps1`가 있었고 위 설치 명령은 종료 코드 0, `up to date`를 반환했다. 다만 `package.json`의 정확한 Node.js `24.19.0` 요구와 설치 환경의 `24.22.0` 차이로 `EBADENGINE` 경고가 있었다. **무경고 설치로 기록하지 않는다.** `npm.cmd run check`의 종료 코드 0은 학생 파일 문법 확인일 뿐이다.

`npm.cmd start`가 `http://127.0.0.1:5189/`를 표시했고 별도 GET은 **HTTP 200**이었다. 브라우저에서 `보호 현황`, `업무 앱`, `보안 기록` 메뉴와 학생 표시 영역을 직접 봤다. 계정·기기·세션·기록은 `연결 없음`/`ENGINE_NOT_CONNECTED`, 업무 앱은 목록 연결 실패로 판정 요청 전 상태였다. AI 설명·조치 집행·OSV 조회는 실행하지 않았다. 화면 표시와 HTTP 200은 기존 SDP/XDR·AI·OSV 연결 성공의 근거가 아니다.

이 자동화 환경에서는 서버 프로세스에 종료 신호를 보낼 권한이 없어 **중지·재실행은 미확인**이다. 사용자는 자신이 실행한 `npm.cmd start` 창에서 `Ctrl+C`로 끄고, 같은 복제본의 `on-client`에서 다시 켜서 브라우저 응답을 확인한다. 다른 프로그램의 프로세스는 종료하지 않는다. 상세한 명령·구성도·오류 대응은 [21단계 학생 실행 설명서](STUDENT_RUNBOOK.md)를 따른다.

## 13~21단계 누적 대조

사용자는 각 단계의 공식 판정 전 항목 통과를 알려 주었다. 이는 아래 **21단계 기준 커밋의 새 복제본 실측**이나 운영 연결 확인과 별개다. 관찰 시각은 모두 2026-10-23 16:49 KST다. 모의 데이터 시험은 이번 복제본에서 하지 않았다.

| 단계·기능 | 새 복제본의 관찰 결과·근거 | 미확인 원인 |
|---|---|---|
| 13 계정·기기·세션 | 브라우저 `student-identity`의 연결 없음·오류 문구 | 인증·SDP 연결 없음; 값 변경·재조회 미실행 |
| 14 업무 앱 접속 판정 | `student-decision`의 요청 전 안내 | 앱 목록 없음; allow/deny/challenge/unknown 실측 불가 |
| 15 접속·XDR 기록 | `student-events`의 연결 실패 문구 | 실제 본인 사건·상세·필터 미확인 |
| 16 상태·알림·오류 | `student-status`의 기기·세션 실패 및 `ENGINE_NOT_CONNECTED` 알림 | 정상 자료·다른 장애·미지원 조치 화면 미확인 |
| 17 앱 AI 연결 | `student-ai-connection`의 점검 전 안내 | 계정·앱 승인 없음; 유료 모델 요청 미실행 |
| 18 근거 있는 AI 설명 | `student-explanation`의 사건 선택 전 안내 | 사건·AI 권한 없음; 설명 요청 미실행 |
| 19 조치 제안·결과 | `student-action`의 idle·미집행 안내 | 원천 집행 연결 미준비; 실집행·효과 미확인 |
| 20 설치 패키지·취약점 | `student-vulnerabilities`의 조회 전 안내 | OSV 조회 미실행; 미조회는 취약점 없음이 아님 |
| 21 설명서·구성도 | 복제본의 `README.md`·`on-client/README.md`·`STUDENT_RUNBOOK.md` 원문 확인 | 타 PC·정확한 Node 24.19.0·기본 실행 도구의 지속 실행 미확인 |

표의 학생 영역은 `student/extension.mjs`가 그린다. 메뉴·요청·서버 처리는 제공 `public/app.js`·`src/server.mjs`에 있으며, 기존 판정·탐지·집행과 AI 게이트웨이는 별도 원천이다. 제공 코드와 학생 제작물의 출처를 섞지 않는다. 사용자 진술, 코드·문서 원문 확인, 브라우저 시연, 실제 원천 연결 검증을 같은 증거로 취급하지 않는다.

## 데이터 보존·백업·복원 계획

1. 원래 폴더의 `git status --short`와 40자리 HEAD를 기록한다. 추적 변경·미추적 파일·백업을 지우거나 덮어쓰지 않는다. Git 복제본에는 **커밋 파일만** 있으므로 미추적 학생 파일은 별도 검토가 필요하다.
2. 학생 코드·문서는 내용을 확인한 뒤 커밋으로 보존한다. 개인 설정, 자격, 실제 로그, DB, 비밀 파일은 Git·제출 JSON에 넣지 않는다. 보존이 필요한 미추적 자료는 소유자가 접근 제한된 별도 보관소에 보관하고 파일명·해시·시각만 안전하게 기록한다. **이번 작업에서 개인 자료 백업은 실행하지 않았다.**
3. `tools/start-alekov.ps1`의 사용자별 계정 보관소는 프로젝트 경로에 종속될 수 있으므로 새 복제본에 무작정 복사하지 않는다. 담당자 승인 절차로 새 환경의 연결을 설정한다. 실제 조치 DB는 제공 `src/actions/`가 이미 있는 지정 SQLite 파일만 사용한다. DB·원천 SDP/XDR의 일관된 백업과 복원은 서비스 중지·소유자 승인·무결성·접근권한 확인을 포함한 **원천 담당자의 절차**로만 한다. 앱 화면 취소나 서버 중지는 이미 집행된 조치를 되돌리지 않는다.
4. 문제 복구 시 원본을 보존한 채 새 폴더에 정확한 커밋을 다시 받아 HEAD·파일 목록·문법·로컬 HTTP·화면 상태를 비교한다. 자격·DB를 자동 복원하지 않는다. 현재 실제 데이터 복원 시험은 **미확인(UNV)**이다.

## 인수인계 상태

현재는 **검증 중**이다. 최종 제출 커밋을 만든 후 그 SHA의 새 복제본에서 종료·재실행과 누적 화면을 다시 확인하고 확인한 범위만 기록한다. 현재 계정의 SDP/XDR·AI·OSV 연결, 19단계 실제 집행과 효과는 미완료다. 22단계 통과도 운영 인증이나 v1.0 자동 인증이 아니다. 단계 제출·비공개 원문 JSON 생성·실제 보안 조치는 사용자가 별도로 결정한다.
