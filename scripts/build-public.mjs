import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deploymentIdentity } from './deployment-identity.mjs';

const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(
  await readFile(resolve(root, 'aleph.config.json'), 'utf8')
);

if (config.step < 2) {
  throw new Error('Stage 2 이상에서 보호된 자료 API를 사용해야 합니다.');
}

await mkdir(resolve(root, 'public'), { recursive: true });

console.log(
  'Stage 2: 공개 data.json 복사를 건너뛰고 보호된 자료 API를 사용합니다.'
);

if (!process.argv.includes('--local')) {
  const identity = deploymentIdentity(process.env, config);

  await writeFile(
    resolve(root, 'public', 'aleph.json'),
    `${JSON.stringify(identity, null, 2)}\n`,
    'utf8'
  );

  console.log(
    '배포 저장소·커밋·주소를 public/aleph.json에 기록했습니다.'
  );
}
