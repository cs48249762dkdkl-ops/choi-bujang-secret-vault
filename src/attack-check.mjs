// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (config.step !== 3) {
    throw new Error('Stage 3 공격 점검은 config.step=3에서 실행해야 합니다.');
  }

  let app;
  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }

  if (
    app.protocol !== 'https:' ||
    app.username ||
    app.password ||
    app.search ||
    app.hash ||
    app.pathname !== '/' ||
    app.hostname.endsWith('.example')
  ) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }

  const checks = [];

  const publicDataResponse = await fetch(new URL('/data.json', app), {
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
  });

  checks.push({
    attackId: 'anonymous_static_note_read',
    expected: '비로그인 요청으로 공개 data.json의 가상 메모리를 읽을 수 없어야 함',
    observed: publicDataResponse.status === 404
      ? '비로그인 요청에서 공개 data.json이 제공되지 않음 (HTTP 404)'
      : `data.json이 예상과 다른 응답을 반환함 (HTTP ${publicDataResponse.status})`,
  });

  const apiResponse = await fetch(new URL('/api/notes', app), {
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
  });

  let apiData = null;

  try {
    apiData = await apiResponse.json();
  } catch {
    apiData = null;
  }

  const apiBlocked =
    (apiResponse.status === 401 || apiResponse.status === 403) &&
    apiData?.error === 'LOGIN_REQUIRED';

  checks.push({
    attackId: 'anonymous_notes_api_read',
    expected: '비로그인 요청의 /api/notes 접근이 인증 오류로 거부되어야 함',
    observed: apiBlocked
      ? `비로그인 요청이 인증 오류로 거부됨 (HTTP ${apiResponse.status})`
      : `비로그인 요청이 예상된 인증 오류로 거부되지 않음 (HTTP ${apiResponse.status})`,
  });

  return checks;
}
