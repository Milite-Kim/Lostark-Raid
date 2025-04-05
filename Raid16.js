// ✅ raid16.js - 16인 기준 공격대 구성 (모듈 스코프 적용)
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
    const results = [];

    for (let round = 0; round < maxRounds; round++) {
      const available = buildCharacterPool(users, round, usedIds);

      let success = false, raid;
      for (let accSwitch = 1; accSwitch <= 3 && !success; accSwitch++) {
        for (let allowDup of [false, true]) {
          const result = tryBuildRaid(available, 4, {
            allowDuplicateDealers: allowDup,
            maxAccountSwitches: accSwitch,
            maxRetries: 500
          });
          if (result.success) {
            success = true;
            raid = result.raid;
            break;
          }
        }
      }

      if (!success || !raid) {
        console.warn(`⚠️ ${round + 1}회차: 유저 캐릭터만으로 구성 실패. 외부 인원으로 보완 진행.`);
        raid = buildFallbackRaid(available, 4);
      }

      const flatUsed = raid.flat();
      const deficit = 16 - flatUsed.length;
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
        if (c.userIndex >= 0) userUsage[c.userIndex].push(c);
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
