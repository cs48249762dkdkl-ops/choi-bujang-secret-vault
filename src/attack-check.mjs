// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (!Number.isInteger(config.step) || config.step < 3) {
    throw new Error('비로그인 API 공격 점검은 config.step=3 이상에서 실행해야 합니다.');
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

  const check = async (attackId, expected, path) => {
    try {
      const response = await fetch(new URL(path, app), {
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      // A bundle records only the status returned by this invocation.
      // Do not copy response bodies, request IDs, or an earlier probe's result.
      return { attackId, expected, observed: `HTTP ${response.status}` };
    } catch {
      // No HTTP status was observed for this invocation, so it is not evidence of a run.
      return { attackId, expected, observed: 'not_run' };
    }
  };

  // Keep the two requests independent: a missing response for one must not skip the other.
  return [
    await check(
      'anonymous_static_note_read',
      '비로그인 요청으로 공개 data.json의 가상 메모리를 읽을 수 없어야 함',
      '/data.json',
    ),
    await check(
      'anonymous_notes_api_read',
      '비로그인 요청의 /api/notes 접근이 인증 오류로 거부되어야 함',
      '/api/notes',
    ),
  ];
}
