// ✅ raid16.js - 16인 기준 공격대 구성 (1.0.1 버전 기준)
(() => {
  const userCount = 16;
  const partySize = 4;
  const raidPartyCount = userCount / partySize;

  // 🧱 입력창 생성
  const userListDiv = gid('user-list');
  userListDiv.innerHTML = "";
  for (let i = 0; i < userCount; i++) {
    const div = ce('div');
    div.className = 'user-input';
    div.innerHTML = `
      <label>유저 ${i + 1}</label>
      <textarea id="user-${i}" placeholder="60 환수사 / 60 건슬 // 70 소울 / 40 바드"></textarea>
    `;
    userListDiv.appendChild(div);
  }

  function generateRaid() {
    showGeneratingStatus();

    const inputs = [];
    for (let i = 0; i < userCount; i++) {
      const val = gid(`user-${i}`).value.trim();
      if (val) inputs.push(val);
    }
    if (inputs.length !== userCount) return al("모든 유저 정보를 입력해주세요.");

    let users = [];
    let globalId = 0;
    try {
      users = inputs.map((text, i) => {
        const parsed = parseUserInput(text, i);
        parsed.characters.forEach(c => (c.id = globalId++));
        return parsed;
      });
    } catch (err) {
      return al(err.message);
    }

    const maxRounds = Math.max(...users.map(u => u.characters.length));
    const usedIds = new Set();
    const userUsage = Array(userCount).fill(null).map(() => []);
    const remainingByUser = users.map(u => u.characters.length);
    const results = [];

    for (let round = 0; round < maxRounds; round++) {
      const mandatoryUsers = remainingByUser
        .map((count, idx) => ({ idx, count }))
        .filter(u => u.count > 0)
        .map(u => u.idx);

      const available = users.flatMap((u, idx) => {
        if (remainingByUser[idx] <= 0) return [];
        return u.characters.filter(c => !usedIds.has(c.id));
      });

      let success = false, raid;
      for (let accSwitch = 1; accSwitch <= 3 && !success; accSwitch++) {
        for (let allowDup of [false, true]) {
          const result = tryBuildRaid(available, raidPartyCount, {
            allowDuplicateDealers: allowDup,
            maxAccountSwitches: accSwitch,
            maxRetries: 500
          });

          if (result.success) {
            const flat = result.raid.flat();
            const partyValid = result.raid.every(p => p.filter(c => c.type === '서포터').length === 1);
            const allMandatoryIncluded = mandatoryUsers.every(idx =>
              flat.some(c => c.userIndex === idx)
            );
            const totalSupporters = flat.filter(c => c.type === '서포터').length;
            if (!partyValid || !allMandatoryIncluded || totalSupporters !== 4) continue;

            success = true;
            raid = result.raid;
            break;
          }
        }
      }

      if (!success || !raid) {
        console.warn(`⚠️ ${round + 1}회차: 유저 캐릭터만으로 구성 실패. 외부 인원으로 보완 진행.`);
        raid = buildFallbackRaid(available, raidPartyCount).filter(p => p.length === 4);
      }

      const flatUsed = raid.flat();
      const deficit = partySize * raidPartyCount - flatUsed.length;
      for (let i = 0; i < deficit; i++) {
        const dummy = {
          userIndex: -1,
          job: "딜러",
          level: 60,
          type: "딜러",
          id: `외부-${round}-${i}`
        };
        for (let p = raid.length - 1; p >= 0; p--) {
          if (raid[p].length < 4) {
            raid[p].push(dummy);
            break;
          }
        }
      }

      raid.flat().forEach(c => {
        if (c.userIndex !== -1) usedIds.add(c.id);
        if (c.userIndex >= 0) {
          userUsage[c.userIndex].push(c);
          remainingByUser[c.userIndex]--;
        }
      });

      results.push(raid);
    }

    let output = `🧝‍♂️ 유저별 캐릭터 사용 현황 (사용 순서대로)\n\n`;
    userUsage.forEach((used, i) => {
      const line = used.map(c => `${c.level} ${c.job}`).join(" / ");
      output += `유저 ${i + 1}: ${line}\n`;
    });
    gid("result").textContent = output;
  }

  window.generateRaid = generateRaid;
})();
