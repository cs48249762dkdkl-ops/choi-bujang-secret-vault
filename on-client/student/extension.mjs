// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions }) {
      const root = document.createElement('div');
      const deviceStatus = {
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가',
      };
      const sessionStatus = {
        active: '활성',
        expired: '만료',
        revoked: '철회됨',
        unknown: '확인 불가',
      };
      const modeLabel = {
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      };

      const line = (parent, text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        parent.append(paragraph);
      };
      const section = (title, resource, showData) => {
        const block = document.createElement('section');
        const heading = document.createElement('h3');
        heading.textContent = title;
        block.append(heading);

        if (modeLabel[resource?.mode]) line(block, modeLabel[resource.mode]);
        if (resource?.status === 'loading') {
          line(block, '불러오는 중');
        } else if (resource?.status === 'error') {
          const message = resource.error?.message;
          line(block, `연결 실패: ${typeof message === 'string' && message.trim() ? message : '확인 불가'}`);
        } else if (resource?.status === 'ok') {
          showData(block, resource.data);
        } else {
          line(block, '확인 불가');
        }
        root.append(block);
      };

      section('현재 계정·기기·세션', me, (block, data) => {
        line(block, `사용자: ${data?.user?.label ?? '확인 불가'} · ID: ${data?.user?.id ?? '확인 불가'}`);
        line(block, `현재 기기: ${data?.device?.label ?? '확인 불가'} · ID: ${data?.device?.id ?? '확인 불가'} · 상태: ${deviceStatus[data?.device?.status] ?? '확인 불가'} (${data?.device?.status ?? '확인 불가'})`);
        line(block, `로그인 세션: ID: ${data?.session?.id ?? '확인 불가'} · 상태: ${sessionStatus[data?.session?.status] ?? '확인 불가'} (${data?.session?.status ?? '확인 불가'})`);
      });
      section('내 기기 목록', devices, (block, data) => {
        if (!Array.isArray(data) || data.length === 0) return line(block, '표시할 기기가 없습니다.');
        const list = document.createElement('ul');
        for (const device of data) {
          const item = document.createElement('li');
          item.textContent = `${device.label ?? '확인 불가'} · ID: ${device.id ?? '확인 불가'} · 상태: ${deviceStatus[device.status] ?? '확인 불가'} (${device.status ?? '확인 불가'})`;
          list.append(item);
        }
        block.append(list);
      });
      section('내 세션 목록', sessions, (block, data) => {
        if (!Array.isArray(data) || data.length === 0) return line(block, '표시할 세션이 없습니다.');
        const list = document.createElement('ul');
        for (const session of data) {
          const item = document.createElement('li');
          item.textContent = `ID: ${session.id ?? '확인 불가'} · 상태: ${sessionStatus[session.status] ?? '확인 불가'} (${session.status ?? '확인 불가'})`;
          list.append(item);
        }
        block.append(list);
      });
      return root;
    },
    renderDecision({ status, mode, data, error, appId }) {
      const root = document.createElement('div');
      const line = (text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        root.append(paragraph);
      };
      const modeLabel = {
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      };
      if (Object.hasOwn(modeLabel, mode)) line(`데이터 상태: ${modeLabel[mode]}`);

      if (status === 'idle') {
        line('앱을 골라 접속을 요청하세요.');
      } else if (status === 'loading') {
        if (appId) line(`선택한 앱 ID: ${appId}`);
        line('판정 확인 중');
      } else if (status === 'error') {
        if (appId) line(`선택한 앱 ID: ${appId}`);
        const message = error?.message;
        line(`요청 실패: ${typeof message === 'string' && message.trim() ? message : '확인 불가'}`);
        line('요청 실패는 접근 거부 판정이 아닙니다.');
      } else if (status === 'ok') {
        const decisionLabel = {
          allow: '접근 허용',
          deny: '접근 거부',
          challenge: '추가 확인 필요',
          unknown: '확인 불가',
        };
        const decision = Object.hasOwn(decisionLabel, data?.decision) ? data.decision : 'unknown';
        line(`판정 대상 앱 ID: ${data?.appId ?? appId ?? '확인 불가'}`);
        line(`접근 판정: ${decisionLabel[decision]} (${decision})`);
        if (decision === 'allow') line('정책상 접근 허용이며 실제 앱 접속 성공을 보장하지 않습니다.');
        if (decision === 'challenge') line('이 화면은 추가 인증·확인 절차를 대신 수행하지 않습니다.');
        if (decision === 'unknown') line('접근 허용으로 판단하지 마세요.');
        line(`판정 이유: ${typeof data?.reason === 'string' && data.reason.trim() ? data.reason : '확인 불가'}`);
        line(`판정 시각: ${typeof data?.checkedAt === 'string' && data.checkedAt.trim() ? data.checkedAt : '확인 불가'}`);
      } else {
        line('판정 요청 상태 확인 불가');
      }
      return root;
    },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
