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
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
  });

  let publicNotesVisible = false;

  if (publicDataResponse.ok) {
    const contentType = publicDataResponse.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        const data = await publicDataResponse.json();
        publicNotesVisible =
          Array.isArray(data?.notes) &&
          data.notes.length > 0;
      } catch {
        publicNotesVisible = false;
      }
    }
  }

  checks.push({
    attackId: 'anonymous_static_note_read',
    expected: '비로그인 요청으로 공개 data.json의 가상 메모를 읽을 수 없어야 함',
    observed: publicNotesVisible
      ? '비로그인 요청에서 공개 가상 메모가 확인됨'
      : `비로그인 요청에서 공개 가상 메모가 확인되지 않음 (HTTP ${publicDataResponse.status})`,
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
