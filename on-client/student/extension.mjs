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
    renderEvents({ status, mode, data, error }) {
      const root = document.createElement('div');
      const line = (parent, text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        parent.append(paragraph);
        return paragraph;
      };
      const modeLabel = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
      if (Object.hasOwn(modeLabel, mode)) line(root, `데이터 상태: ${modeLabel[mode]}`);

      if (status === 'loading') {
        line(root, '기록 불러오는 중');
        return root;
      }
      if (status === 'error') {
        const message = typeof error?.message === 'string' && error.message.trim() ? error.message : '확인 불가';
        const unverified = error?.code === 'CONTRACT_MISMATCH' || error?.code === 'ENGINE_RESULT_UNVERIFIED';
        line(root, `기록을 불러오지 못했습니다${unverified ? ' (확인 불가)' : ''}: ${message}`);
        return root;
      }
      if (status !== 'ok' || !Array.isArray(data)) {
        line(root, '기록 상태 확인 불가');
        return root;
      }
      line(root, '전달된 본인 최근 기록만 표시합니다. 전체 직원 이력이나 실시간 전체 위협 탐지가 아닙니다.');
      if (data.length === 0) {
        line(root, '표시할 기록이 없습니다.');
        return root;
      }

      const events = [...data].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      const filters = document.createElement('div');
      const makeFilter = (name, values) => {
        const label = document.createElement('label');
        label.textContent = name;
        const select = document.createElement('select');
        const all = document.createElement('option');
        all.value = 'all';
        all.textContent = '전체';
        select.append(all);
        for (const value of values) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          select.append(option);
        }
        label.append(select);
        filters.append(label);
        return select;
      };
      const kindFilter = makeFilter('기록 종류', [...new Set(events.map(event => event.kind))]);
      const appFilter = makeFilter('업무 앱', [...new Set(events.map(event => event.appId).filter(appId => typeof appId === 'string'))]);
      const accessFilter = makeFilter('접속 상태', [...new Set(events.map(event => event.state.access))]);
      root.append(filters);
      const count = line(root, '');
      const list = document.createElement('ul');
      root.append(list);
      const detailHost = document.createElement('div');
      root.append(detailHost);
      const accessStatus = { allowed: '접근 허용', denied: '접근 거부', unknown: '확인 불가' };
      const sessionStatus = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
      const deviceStatus = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
      const statusText = (labels, value) => {
        const code = Object.hasOwn(labels, value) ? value : 'unknown';
        return `${labels[code]}(${code})`;
      };
      const showDetail = (event) => {
        detailHost.replaceChildren();
        const detail = document.createElement('section');
        detail.setAttribute('data-student-event-detail', event.id);
        const heading = document.createElement('h4');
        heading.textContent = `${event.id} 상세`;
        detail.append(heading);
        line(detail, `기록 ID: ${event.id} · 앱: ${event.appId ?? '앱을 확인할 수 없음'}`);
        const evidenceHeading = document.createElement('h5');
        evidenceHeading.textContent = '근거';
        detail.append(evidenceHeading);
        if (event.evidence.length === 0) line(detail, '표시할 근거가 없습니다.');
        for (const entry of event.evidence) line(detail, `근거 ID: ${entry.id} · 내용: ${entry.text}`);
        const rulesHeading = document.createElement('h5');
        rulesHeading.textContent = '규칙';
        detail.append(rulesHeading);
        if (event.rules.length === 0) line(detail, '표시할 규칙이 없습니다.');
        for (const rule of event.rules) line(detail, `규칙 ID: ${rule.id} · 내용: ${rule.text}`);
        line(detail, `접속 상태: ${statusText(accessStatus, event.state.access)}`);
        line(detail, `세션 상태: ${statusText(sessionStatus, event.state.session)}`);
        line(detail, `기기 상태: ${statusText(deviceStatus, event.state.device)}`);
        if (Array.isArray(event.supportedActions) && event.supportedActions.length > 0) {
          line(detail, '조치 실행 연결은 준비 중입니다. 아래 조치는 아직 지원하지 않으며 요청을 보내지 않습니다.');
          for (const action of event.supportedActions) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = `${action} 미지원`;
            button.disabled = true;
            detail.append(button);
          }
        }
        detailHost.append(detail);
      };
      const renderList = () => {
        detailHost.replaceChildren();
        const shown = events.filter(event =>
          (kindFilter.selectedIndex === 0 || event.kind === kindFilter.value)
          && (appFilter.selectedIndex === 0 || event.appId === appFilter.value)
          && (accessFilter.selectedIndex === 0 || event.state.access === accessFilter.value));
        count.textContent = `표시 ${shown.length}건 / 받은 ${data.length}건`;
        list.replaceChildren();
        if (shown.length === 0) {
          const item = document.createElement('li');
          item.textContent = '조건에 맞는 기록이 없습니다.';
          list.append(item);
          return;
        }
        for (const event of shown) {
          const item = document.createElement('li');
          item.setAttribute('data-student-event-id', event.id);
          const kind = event.kind === 'access' ? '접속 기록 (access)' : event.kind === 'xdr' ? 'XDR 경보 (xdr)' : '확인 불가';
          line(item, `기록 ID: ${event.id} · 시각: ${event.at} · 종류: ${kind} · 앱: ${event.appId ?? '앱을 확인할 수 없음'} · 요약: ${event.summary}`);
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = `${event.id} 상세`;
          button.addEventListener('click', () => showDetail(event));
          item.append(button);
          list.append(item);
        }
      };
      for (const select of [kindFilter, appFilter, accessFilter]) select.addEventListener('change', renderList);
      renderList();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode }) {
      const root = document.createElement('div');
      const line = (parent, text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        parent.append(paragraph);
        return paragraph;
      };
      const modeLabels = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
      if (Object.hasOwn(modeLabels, mode)) line(root, `데이터 상태: ${modeLabels[mode]}`);
      const deviceLabels = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
      const sessionLabels = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
      const statusText = (labels, value) => {
        const code = Object.hasOwn(labels, value) ? value : 'unknown';
        return `${labels[code]}(${code})`;
      };
      const heading = (parent, text) => {
        const title = document.createElement('h3');
        title.textContent = text;
        parent.append(title);
      };
      const resourceSection = (title, resource, emptyText, rowText) => {
        const section = document.createElement('section');
        heading(section, title);
        if (Object.hasOwn(modeLabels, resource?.mode)) line(section, `자료 상태: ${modeLabels[resource.mode]}`);
        if (resource?.status === 'loading') {
          line(section, `${title} 불러오는 중`);
        } else if (resource?.status === 'error') {
          const message = typeof resource.error?.message === 'string' && resource.error.message.trim() ? resource.error.message : '확인 불가';
          const timeout = typeof resource.error?.code === 'string' && resource.error.code.includes('TIMEOUT');
          line(section, `${title} 불러오지 못했습니다${timeout ? ' (시간 초과)' : ''}: ${message}`);
          line(section, '다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.');
        } else if (resource?.status === 'ok' && Array.isArray(resource.data)) {
          if (resource.data.length === 0) {
            line(section, emptyText);
          } else {
            const list = document.createElement('ul');
            for (const entry of resource.data) {
              const item = document.createElement('li');
              item.textContent = rowText(entry);
              list.append(item);
            }
            section.append(list);
          }
        } else {
          line(section, `${title} 상태 확인 불가`);
        }
        root.append(section);
      };
      resourceSection('내 기기', devices, '등록된 기기가 없습니다.', device =>
        `기기: ${device.label} · ID: ${device.id} · 상태: ${statusText(deviceLabels, device.status)}`);
      resourceSection('현재 세션', sessions, '현재 연결이 없습니다.', session =>
        `세션 ID: ${session.id} · 상태: ${statusText(sessionLabels, session.status)}`);
      line(root, '세션 조회는 지금 검증된 연결 한 개만 대상으로 하며 지난 세션 전체 목록이 아닙니다.');

      const alerts = document.createElement('section');
      heading(alerts, '알림');
      if (!Array.isArray(notifications) || notifications.length === 0) {
        line(alerts, '주의할 알림이 없습니다.');
      } else {
        const list = document.createElement('ul');
        for (const notice of notifications) {
          const item = document.createElement('li');
          item.textContent = `자료: ${notice.resource} · 코드: ${notice.code} · 내용: ${notice.message}`;
          list.append(item);
        }
        alerts.append(list);
      }
      root.append(alerts);

      const help = document.createElement('section');
      heading(help, '진단 정보');
      if (Object.hasOwn(modeLabels, diagnostics?.mode)) line(help, `자료 상태: ${modeLabels[diagnostics.mode]}`);
      let copyText = null;
      if (diagnostics?.status === 'loading') {
        line(help, '진단 정보 불러오는 중');
      } else if (diagnostics?.status === 'error') {
        const message = typeof diagnostics.error?.message === 'string' && diagnostics.error.message.trim() ? diagnostics.error.message : '확인 불가';
        const timeout = typeof diagnostics.error?.code === 'string' && diagnostics.error.code.includes('TIMEOUT');
        line(help, `진단 정보를 불러오지 못했습니다${timeout ? ' (시간 초과)' : ''}: ${message}`);
        line(help, '다시 시도는 위쪽 도움정보 불러오기 버튼을 직접 누르세요.');
      } else if (diagnostics?.status === 'ok') {
        const safeValue = value => typeof value === 'string' && value.trim() ? value : '확인 불가';
        const data = diagnostics.data;
        const fields = [
          ['requestId', safeValue(data?.requestId)],
          ['component', safeValue(data?.component)],
          ['version', safeValue(data?.version)],
          ['checkedAt', safeValue(data?.checkedAt)],
          ['engine.mode', safeValue(data?.engine?.mode)],
          ['engine.code', safeValue(data?.engine?.code)],
        ];
        for (const [name, value] of fields) line(help, `${name}: ${value}`);
        copyText = fields.map(([name, value]) => `${name}: ${value}`).join('\n');
        line(help, '아래 버튼은 표시된 비밀 없는 진단 정보를 도움 요청에 쓰도록 복사합니다. 자동으로 전송하지 않습니다.');
      } else {
        line(help, '진단 정보는 아직 확인하지 않았습니다. 위쪽 도움정보 불러오기 버튼을 직접 누르세요.');
      }
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = '도움정보 복사';
      copy.disabled = copyText === null;
      copy.addEventListener('click', async () => {
        if (copyText === null) return;
        try {
          await navigator.clipboard.writeText(copyText);
          result.textContent = '도움정보를 클립보드에 복사했습니다.';
        } catch {
          result.textContent = '도움정보를 복사하지 못했습니다. 브라우저의 클립보드 권한을 확인하세요.';
        }
      });
      help.append(copy);
      const result = line(help, '');
      root.append(help);
      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
