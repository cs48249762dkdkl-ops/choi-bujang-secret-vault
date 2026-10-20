import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const bundleScript = await readFile(new URL('../scripts/bundle.mjs', import.meta.url), 'utf8');
const loadNotes = page.slice(
  page.indexOf('async function loadNotes('),
  page.indexOf('memoForm.addEventListener')
);

test('자료실은 서버 승인과 소유 증명 확인 후에만 메모를 요청하고 연다', () => {
  assert.match(page, /<section id="memo-panel" hidden>/u);
  assert.match(loadNotes, /fetch\('\/api\/device\/status',\s*\{/u);
  assert.match(loadNotes, /fetch\('\/api\/notes',\s*\{\s*cache: 'no-store'/u);
  assert.ok(
    loadNotes.indexOf("fetch('/api/device/status'") <
    loadNotes.indexOf("fetch('/api/notes'")
  );
  assert.ok(
    loadNotes.indexOf("approval.deviceProofVerified !== true") <
    loadNotes.indexOf("fetch('/api/notes'")
  );
  assert.ok(loadNotes.indexOf('if (!response.ok)') < loadNotes.indexOf('memoPanel.hidden = false;'));
  assert.match(page, /loadNotes\(session\.access_token\)/u);
  assert.match(page, /loadNotes\(nextSession\.access_token\)/u);
  assert.match(page, /서버가 승인된 기기 세션과 자료실 접근을 확인했습니다/u);
  assert.match(page, /notesLoadRequest \+= 1/u);
});

test('앱 브라우저 저장소에서 기기 키 항목을 값 출력 없이 제거한다', () => {
  assert.match(page, /for \(const storageName of \['localStorage', 'sessionStorage'\]\)/u);
  assert.match(page, /storage\.removeItem\(key\)/u);
  assert.doesNotMatch(page, /storage\.getItem\(/u);
  assert.match(page, /기기 키 저장소를 정리할 수 없어 보호 자료를 열지 않습니다/u);
});

test('제출 묶음 생성은 기기 키 필드명을 거부한다', () => {
  assert.match(bundleScript, /deviceKeyFieldPattern/u);
  assert.match(bundleScript, /기기 키/u);
});
