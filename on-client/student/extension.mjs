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
    renderAiConnection({ status, mode, data, error, checkedAt }) {
      const root = document.createElement('div');
      const line = text => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        root.append(paragraph);
      };
      const modeLabels = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
      if (Object.hasOwn(modeLabels, mode)) line(`데이터 상태: ${modeLabels[mode]}`);

      if (status === 'idle') {
        line('AI 연결 점검 전입니다. 이전 점검 결과는 현재 결과가 아닙니다.');
      } else if (status === 'loading') {
        line('AI 연결 점검 중입니다. 아직 결과가 없습니다.');
      } else if (status === 'ok') {
        const authorization = data?.audienceAuthorization;
        if (data?.transportChecked !== true || !['test', 'verified'].includes(authorization)) {
          line('AI 연결 점검 결과를 확인할 수 없습니다.');
        } else {
          line(authorization === 'test' ? '시험 연결 점검(test)' : '앱 권한 확인 후 점검(verified)');
          line(`응답 모델 수: ${Number.isInteger(data.modelCount) && data.modelCount >= 0 ? data.modelCount : '확인 불가'}`);
          line(`점검 시각: ${typeof checkedAt === 'string' && checkedAt.trim() ? checkedAt : '확인 불가'}`);
          line('모델 목록 응답으로 연결만 점검했습니다. 사건 설명은 아직 실행하지 않았습니다.');
        }
      } else if (status === 'error') {
        const code = typeof error?.code === 'string' && error.code.trim() ? error.code : 'AI_REQUEST_UNVERIFIED';
        const message = typeof error?.message === 'string' && error.message.trim() ? error.message : '확인 불가';
        const guidance = {
          ON_AI_PROVISIONING_PENDING: '계정 연결과 앱 이용 권한이 준비 중이거나 확인되지 않았습니다. 담당자에게 확인을 요청하세요.',
          ON_AI_AUTHORIZATION_CHANGED: '앱 이용 권한이 변경됐습니다. 담당자에게 현재 권한을 확인하세요.',
          WB_CLCO_AUTH_REQUIRED: '계정 연결을 다시 확인하고 담당자에게 앱 인증 상태를 확인하세요.',
          WB_CLCO_ACCESS_BLOCKED: '앱 AI 접근이 제한됐습니다. 계정 연결과 담당자 권한 확인이 필요합니다.',
          SUBJECT_SCOPE_UNVERIFIED: '현재 계정의 이용 범위를 확인할 수 없습니다. 담당자에게 확인하세요.',
          WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반의 AI 사용량이 소진됐습니다. 담당자에게 확인하세요.',
          WB_CLCO_LIMIT_REACHED: 'AI 이용 한도에 도달했습니다. 담당자에게 확인하세요.',
          WB_CLCO_SESSION_CLOSED: '현재 이용 시간이 아닙니다. 이용 가능 시간을 확인하세요.',
          WB_CLCO_RATE_LIMITED: '요청이 제한됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_TIMEOUT: 'AI 응답 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          REQUEST_TIMEOUT: '요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          ENGINE_TIMEOUT: '서버 확인 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          TIMEOUT: '응답 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_NETWORK_ERROR: 'AI 네트워크 연결을 확인할 수 없습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_SERVER_UNAVAILABLE: 'AI 서버가 응답하지 않습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
          CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
          REQUEST_CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
          MODEL_NOT_CONFIGURED: '사용할 모델이 설정되지 않았습니다. 담당자에게 모델 허용 설정을 확인하세요.',
          ON_AI_MODEL_LIST_EMPTY: '쓸 수 있는 모델이 없습니다. 담당자에게 모델 허용 설정을 확인하세요.',
        };
        line(`AI 연결 점검 실패: ${code} · ${message}`);
        line(Object.hasOwn(guidance, code) ? guidance[code] : 'AI 연결 결과를 확인할 수 없습니다. 담당자에게 계정과 앱 권한을 확인하세요.');
      } else {
        line('AI 연결 점검 상태를 확인할 수 없습니다.');
      }
      line('다시 점검은 사용자가 현재 API 연결 점검 버튼을 직접 눌러야 합니다. 자동으로 다시 점검하지 않습니다.');
      return root;
    },
    renderExplanation({ event, explanation, checkedAt }) {
      const root = document.createElement('div');
      const line = (parent, text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        parent.append(paragraph);
      };
      const heading = text => {
        const title = document.createElement('h4');
        title.textContent = text;
        root.append(title);
      };
      const safeCode = /^[A-Z][A-Z0-9_]{0,95}$/.test(explanation?.error?.code ?? '')
        ? explanation.error.code : null;
      const unusable = reason => {
        line(root, `AI 설명을 사용할 수 없습니다: ${reason}`);
        if (safeCode) line(root, `오류 코드: ${safeCode}`);
        line(root, '보안 기록은 그대로입니다. 근거가 없는 내용을 만들어 표시하지 않습니다.');
        return root;
      };

      // 오류가 먼저 전달되면 선택된 기록이 없어도 실패 원인을 보여 준다.
      if (explanation?.status === 'error') {
        const message = typeof explanation.error?.message === 'string' && explanation.error.message.trim()
          ? explanation.error.message : '실패 이유를 확인할 수 없습니다.';
        line(root, `AI 설명 실패: ${safeCode ?? 'AI_REQUEST_UNVERIFIED'} · ${message}`);
        line(root, '보안 기록은 그대로입니다. AI 설명 실패는 접근 거부나 과제 실패가 아닙니다.');
        return root;
      }
      if (!event?.id) {
        line(root, '보안 기록에서 기록을 먼저 고르세요.');
        return root;
      }
      if (explanation?.status === 'loading') {
        line(root, `사건 ${event.id}의 AI 설명을 요청하는 중입니다.`);
        return root;
      }
      if (explanation?.status !== 'ok') {
        line(root, '이 사건의 AI 설명은 아직 실행하지 않았습니다.');
        return root;
      }

      const data = explanation.data;
      if (!data || typeof data !== 'object') return unusable('설명 자료를 확인할 수 없습니다.');
      if (data.executed !== false) return unusable('AI가 이미 실행했다고 답한 설명은 사용할 수 없습니다.');
      if (data.requiresHumanConfirmation !== true) return unusable('사람 확인 조건이 맞지 않습니다.');
      if (typeof data.summary !== 'string' || !data.summary.trim()) {
        return unusable('AI 요약을 확인할 수 없습니다.');
      }
      if (!Array.isArray(event.evidence) || event.evidence.length === 0
        || event.evidence.some(row => typeof row?.id !== 'string' || typeof row?.text !== 'string')) {
        return unusable('현재 기록에 대조할 근거가 부족합니다.');
      }
      if (!Array.isArray(event.rules) || !event.rules.every(row => typeof row?.id === 'string' && typeof row?.text === 'string')
        || !event.state || !Array.isArray(event.supportedActions)) {
        return unusable('현재 기록의 규칙·상태·지원 조치를 확인할 수 없습니다.');
      }
      const evidence = new Map(event.evidence.map(row => [row.id, row.text]));
      const references = data.evidenceIds;
      if (evidence.size !== event.evidence.length || !Array.isArray(references)
        || references.length !== evidence.size || new Set(references).size !== references.length
        || references.some(id => !evidence.has(id))) {
        return unusable('인용한 근거 ID가 현재 사건의 근거와 맞지 않습니다.');
      }
      if (!Array.isArray(data.proposals) || data.proposals.some(proposal =>
        typeof proposal?.action !== 'string' || !event.supportedActions.includes(proposal.action)
        || typeof proposal.reason !== 'string' || !proposal.reason.trim()
        || !Array.isArray(proposal.evidenceIds) || proposal.evidenceIds.length === 0
        || proposal.evidenceIds.some(id => !evidence.has(id)))) {
        return unusable('조치 제안이나 제안 근거가 현재 사건과 맞지 않습니다.');
      }

      // 성공 표식은 현재 사건의 근거와 설명을 모두 대조한 뒤에만 붙인다.
      root.setAttribute('data-student-explanation-event', event.id);
      heading('AI 설명(참고용)');
      line(root, `사건 ID: ${event.id}`);
      line(root, 'AI 요약은 참고 정보입니다. 사실 판단은 아래 근거와 연동 시스템의 현재 상태를 기준으로 합니다.');
      line(root, data.summary);
      if (typeof checkedAt === 'string' && checkedAt.trim()) line(root, `설명 확인 시각: ${checkedAt}`);

      heading('인용한 근거');
      const evidenceList = document.createElement('ul');
      for (const id of references) {
        const item = document.createElement('li');
        item.textContent = `${id} — ${evidence.get(id)}`;
        evidenceList.append(item);
      }
      root.append(evidenceList);

      heading('현재 규칙');
      if (event.rules.length === 0) line(root, '표시할 규칙이 없습니다.');
      const ruleList = document.createElement('ul');
      for (const rule of event.rules) {
        const item = document.createElement('li');
        item.textContent = `${rule.id} — ${rule.text}`;
        ruleList.append(item);
      }
      root.append(ruleList);

      const labels = {
        access: { allowed: '접근 허용', denied: '접근 거부', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
        device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
      };
      const names = { access: '접속', session: '세션', device: '기기' };
      heading('현재 상태');
      for (const key of ['access', 'session', 'device']) {
        const code = Object.hasOwn(labels[key], event.state[key]) ? event.state[key] : 'unknown';
        line(root, `${names[key]}: ${labels[key][code]}(${code})`);
      }
      heading('확인되지 않은 현재 상태');
      const unknown = ['access', 'session', 'device'].filter(key => event.state[key] === 'unknown');
      if (unknown.length === 0) line(root, '없음');
      else for (const key of unknown) line(root, `${names[key]}: 확인 불가(unknown)`);

      heading('조치 제안');
      if (data.proposals.length === 0) {
        line(root, event.supportedActions.length === 0
          ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
          : 'AI가 이 사건에 제안한 조치가 없습니다.');
      } else {
        const proposalList = document.createElement('ul');
        for (const proposal of data.proposals) {
          const item = document.createElement('li');
          item.textContent = `${proposal.action} — 이유: ${proposal.reason} · 근거 ID: ${proposal.evidenceIds.join(', ')} · 사람 확인이 필요하며 실행되지 않았습니다.`;
          proposalList.append(item);
        }
        root.append(proposalList);
      }
      line(root, 'AI 설명과 제안만으로 보안 조치는 실행되지 않았습니다.');
      return root;
    },
    renderAction({ status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error }) {
      // 매번 새 DOM을 반환하여 이전 사건·대상·요청의 표시를 남기지 않는다.
      const root = document.createElement('div');
      const line = (text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        root.append(paragraph);
      };
      const value = (input) => typeof input === 'string' && input.trim() ? input : null;
      const eventId = value(event?.id);
      const selectedAction = value(actionId);
      const requestId = value(receipt?.requestId);
      const sameIntent = (!receipt?.eventId || receipt.eventId === eventId)
        && (!receipt?.actionId || receipt.actionId === selectedAction);

      if (eventId) root.dataset.studentActionEvent = eventId;
      if (requestId && sameIntent) root.dataset.studentActionRequest = requestId;

      const effectConfirmed = status === 'succeeded' && observation?.effectApplied === true && sameIntent;
      if (!sameIntent) {
        line('현재 사건·조치와 서버 기록이 일치하지 않습니다. 결과 불명(unknown)이며 성공이나 효과 없음으로 판단하지 마세요. 연동 시스템 결과만 재조회하세요.');
      } else if (status === 'idle') {
        line('아직 미실행(idle). AI 조치 제안은 실제 집행이 아닙니다.');
      } else if (status === 'loading') {
        line('조치 준비 또는 연동 시스템 결과 조회 중(loading). 완료나 효과는 아직 확인되지 않았습니다.');
      } else if (status === 'prepared') {
        line('준비됨·미실행(prepared). 실제 대상과 조치를 확인한 뒤 제공 화면에서 사람이 별도로 집행을 확인해야 합니다.');
      } else if (status === 'executing') {
        line('사람 확인 후 서버에 전달 중(executing). 결과는 아직 확인되지 않았습니다.');
      } else if (status === 'pending') {
        line('서버 접수·처리 중(pending). 접수 응답(ACK)은 실제 효과 확인이 아닙니다.');
      } else if (effectConfirmed) {
        line('연동 시스템 효과 확인(succeeded).');
      } else if (status === 'succeeded' || status === 'unknown') {
        line('결과 불명(unknown). 성공이나 효과 없음으로 판단하지 말고 연동 시스템 결과만 재조회하세요.');
      } else if (status === 'denied') {
        line('연동 시스템이 조치를 거절했습니다(denied).');
      } else if (status === 'failed') {
        line('연동 시스템에서 조치가 실패했습니다(failed).');
      } else if (status === 'expired') {
        line('사람 확인 기한이 지났습니다(expired). 현재 준비로 집행하지 말고 다시 준비하세요.');
      } else if (status === 'error') {
        line('요청이 처리되지 않았습니다(error). 거절 판정이나 효과 확인이 아닙니다.');
      } else {
        line('조치 상태 확인 불가(unknown). 성공이나 효과 없음으로 판단하지 마세요.');
      }

      if (eventId) line(`현재 사건 ID: ${eventId}`);
      if (Array.isArray(event?.evidence)) {
        const evidenceIds = event.evidence.map((item) => value(item?.id)).filter(Boolean);
        if (evidenceIds.length) line(`근거 ID: ${evidenceIds.join(', ')}`);
      }
      if (selectedAction) line(`조치 ID: ${selectedAction}`);
      if (value(target?.id)) line(`실제 대상 ID: ${target.id}`);
      if (target?.generation !== undefined && target?.generation !== null) line(`대상 세대: ${target.generation}`);
      if (status === 'prepared' && value(confirmationExpiresAt)) line(`사람 확인 기한: ${confirmationExpiresAt}`);
      if (sameIntent && requestId) line(`요청 ID: ${requestId}`);
      if (sameIntent && value(receipt?.receiptId)) line(`영수증 ID: ${receipt.receiptId}`);
      if (sameIntent && receipt?.version !== undefined && receipt?.version !== null) line(`영수증 버전: ${receipt.version}`);
      if (sameIntent && receipt?.replayed === true) line('같은 요청의 재조회 결과입니다(replayed). 새 집행 요청이 아닙니다.');
      if (sameIntent && receipt?.superseded === true) line('이전 조회는 최신 결과를 대신하지 않습니다(superseded). 결과만 다시 조회하세요.');
      if (effectConfirmed) {
        if (value(observation?.observedAt)) line(`관측 시각: ${observation.observedAt}`);
        line('effectApplied: true');
      }
      if (value(message)) line(`안내: ${message}`);
      if (error && (status === 'error' || status === 'expired' || status === 'unknown')) {
        if (value(error.code)) line(`오류 코드: ${error.code}`);
        if (value(error.message)) line(`오류 내용: ${error.message}`);
      }
      if (status === 'idle' && event && Array.isArray(event.supportedActions) && event.supportedActions.length === 0) {
        line('현재 기록에는 연동 시스템이 지원하는 조치가 없어 조치 준비 버튼이 나오지 않는 것이 정상입니다.');
      }
      if (status === 'idle') line('조치 화면 취소는 이미 서버에 전달된 효과를 되돌리지 않습니다.');
      return root;
    },
  };
}
