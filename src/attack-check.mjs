// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (config.step !== 2) {
    throw new Error('Stage 2 공격 점검은 config.step=2에서 실행해야 합니다.');
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
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });

  checks.push({
    attackId: 'anonymous_static_note_read',
    expected: '비로그인 요청으로 공개 data.json을 읽을 수 없어야 함',
    observed: publicDataResponse.ok
      ? `비로그인 요청에서 /data.json이 응답함 (HTTP ${publicDataResponse.status})`
      : `비로그인 요청에서 /data.json을 읽지 못함 (HTTP ${publicDataResponse.status})`,
  });

  const apiResponse = await fetch(new URL('/api/notes', app), {
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });

  let apiValid = false;

  if (apiResponse.ok) {
    try {
      const data = await apiResponse.json();
      apiValid = Array.isArray(data?.notes) && data.notes.length === 3;
    } catch {
      apiValid = false;
    }
  }

  checks.push({
    attackId: 'anonymous_notes_api_read',
    expected: 'Stage 2 API가 정상 응답하되 서버 전용 키는 노출하지 않아야 함',
    observed: apiValid
      ? '비로그인 요청에서 /api/notes가 정상 응답함'
      : `비로그인 요청에서 /api/notes의 예상 형식이 확인되지 않음 (HTTP ${apiResponse.status})`,
  });

  return checks;
}
