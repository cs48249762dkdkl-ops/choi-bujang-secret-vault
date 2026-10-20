# 12단계 재점검 기록 — 2026-10-20

이 문서는 심판이 보고한 `S12_SCREEN_MISMATCH`와 `S12_SOURCE_MIXED`에 대해, 확인된 증거와 아직 확인되지 않은 내용을 구분한다. **심판 재평가 통과를 선언하는 문서가 아니다.**

## 실제 HTTP 점검과 제출 기록

대상: `https://choi-bujang-secret-vault-rust.vercel.app/`  
기준 작업 브랜치: `codespace-recovery`  
이전 제출 기준 커밋: `8cade98`

| 점검 | 기대 결과 | 확인된 실제 결과 | 증거 / 한계 |
|---|---|---|---|
| 비로그인 `GET /data.json` | 공개 자료가 제공되지 않음 (HTTP 404) | HTTP 404 | `npm run bundle`의 실제 요청으로 얻은 `attackAttempts.observed` 값. 별도 요청 ID와 시각은 수집하지 않음 |
| 비로그인 `GET /api/notes` | HTTP 401 `LOGIN_REQUIRED` | HTTP 401, `{"error":"LOGIN_REQUIRED"}` | 2026-10-20T04:56:07Z의 직접 `curl.exe -i` 응답. `X-Vercel-Id: icn1::iad1::kw66w-1792472167042-858bb081fdd1` |

직전 제출 묶음에는 `GET /api/notes`가 HTTP 500 `SUPABASE_SERVER_CONFIG_MISSING`으로 기록되어 있었다. Vercel의 Production 환경에 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`가 적용되지 않고 Preview에만 적용되어 있음을 확인했다. Production 환경 적용 후 위의 직접 측정에서 HTTP 401이 확인되었고, 제출 묶음을 다시 생성하자 `observed`가 HTTP 401로 갱신되었다. **환경변수의 실제 값이나 인증 토큰은 이 문서와 저장소에 기록하지 않는다.**

이 증거는 두 비로그인 요청에만 해당한다. 정상 사용자 요청, 타인 메모 요청, 미승인 기기 요청, 1~11단계의 나머지 사례, 엔진의 41종 총공세 결과까지 검증한 것이 아니다. 수행하지 않은 시험은 계속 `미실행`으로 기록하고, 화면 수치는 서버의 동일 요청 ID에 대한 기록과 실제로 대조한 경우에만 확인되었다고 적는다. 세부 절차는 [STAGE12_EVIDENCE.md](STAGE12_EVIDENCE.md)를 따른다.

## 학생 작업과 제공 엔진의 출처

| 구분 | 실제 출처 / 역할 |
|---|---|
| 학생 직접 제작: 판정기 | `src/decider.mjs`의 기기 등록, 추가 인증, 자료 구역 규칙 |
| 학생 직접 제작: 탐지 규칙 | `src/detect.mjs`의 이상 조회 탐지 및 회수 **제안** |
| 학생 직접 제작: 접속 앱·자료실 | `public/index.html`, 기기·메모 API, 12단계 작전실의 표시·보호 로직 |
| **과제 제공: ALEPH SDP 엔진** | 엔진이 확인하는 신원·기기 및 판정 요청 전달, 운영 회수 집행과 41종 공격의 최종 평가. 학생 제작 기능이 아님 |
| 외부 인프라 | Supabase는 인증·자료 저장, Vercel은 배포·서버 실행을 담당함. 인프라의 사용은 엔진 판정 통과를 의미하지 않음 |

학생의 로컬 자동 테스트 통과, 화면의 문구, 제출 JSON 생성 성공은 ALEPH SDP 엔진의 운영 판정 성공을 대신하지 않는다. 운영 엔진의 41종 개별 결과가 확보되지 않았으므로 해당 실측 성공 건수를 꾸미지 않는다.

## 제출 관련 주의

- `bundle-notes.json`과 `artifacts/submission.json`은 `.gitignore`에 따라 Git 커밋 대상이 아니다. 제출을 위해 로컬에서 `npm.cmd run bundle`을 다시 실행할 때마다 실시간 API 결과와 제출 커밋 SHA를 재확인한다.
- 제출 화면의 설명에는 학생이 제작한 기능과 **ALEPH SDP 엔진**의 제공 기능을 구분해서 적는다.
- 최종 통과 여부는 **재제출 후 심판 메모와 결과 코드**로만 확인한다.
