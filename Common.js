// ✅ common.js - 8인/16인 공용 함수 및 설정

// 직업군 정의
const 딜러직업군 = [
    "디트", "워로드", "버서커", "딜홀나", "슬레", "배마", "인파", "기공",
    "창술", "스커", "브커", "데헌", "블래", "호크", "스카", "건슬",
    "서머너", "알카", "소서", "데모닉", "블레", "리퍼", "소울", "기상",
    "환수사", "딜바드", "딜도화가"
];

const 서포터직업군 = ["바드", "도화가", "홀나"];

const conflictPairs = [
  ["딜홀나", "홀나"],
  ["딜바드", "바드"],
  ["딜도화가", "도화가"]
];

// DOM 단축
const gid = id => document.getElementById(id);
const ce = tag => document.createElement(tag);
const al = msg => alert(msg);

// 유저 입력 파싱
function parseUserInput(rawText, index) {
  const accountGroups = rawText.split("//").map(g => g.trim());
  const characters = [];
  let groupIndex = 0;

  for (const group of accountGroups) {
    const parts = group.split("/").map(p => p.trim());
    for (const part of parts) {
      const [levelStr, ...jobParts] = part.split(" ");
      const job = jobParts.join("").trim();
      const level = parseInt(levelStr);
      if (isNaN(level) || !job) throw new Error(`유저 ${index + 1} 형식 오류: ${part}`);
      const type = 딜러직업군.includes(job)
        ? "딜러"
        : 서포터직업군.includes(job)
        ? "서포터"
        : "기타";
      if (type === "기타") throw new Error(`${job}은 인식할 수 없는 직업입니다.`);
      characters.push({ userIndex: index, job, level, type, accountGroup: groupIndex });
    }
    groupIndex++;
  }

  if (characters.length < 1 || characters.length > 4)
    throw new Error(`유저 ${index + 1}의 캐릭터 수는 1~4개여야 합니다.`);

  return {
    userIndex: index,
    characters,
    maxRounds: characters.length
  };
}

// 충돌 직업군 체크 함수
function hasConflict(party) {
  const jobs = party.map(c => c.job);
  return conflictPairs.some(([a, b]) => jobs.includes(a) && jobs.includes(b));
}

// 캐릭터 풀 생성 함수 (8인/16인 공용)
function buildCharacterPool(users, round, usedIds) {
  return users.flatMap(user => {
    if (round >= user.maxRounds) return [];
    return user.characters.filter(c => !usedIds.has(c.id));
  });
}

// 공통 구성 중 상태 표시 함수
function showGeneratingStatus() {
  gid("result").textContent = "⚙️ 공격대 구성 중...";
}

// 공통 파티 구성 함수
window.tryBuildRaid = function (pool, numParties) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const result = [];
  const usedUsers = new Set();
  const usedIds = new Set();

  for (let i = 0; i < numParties; i++) {
    const party = [];
    const partyUsers = new Set();
    const partyDealers = [];
    const partySupporters = [];

    for (const c of shuffled) {
      if (usedIds.has(c.id)) continue;
      if (usedUsers.has(c.userIndex)) continue;
      if (partyUsers.has(c.userIndex)) continue;

      if (c.type === "딜러") {
        const isExternal = c.userIndex === -1;
        if (partyDealers.length >= 3) continue;
        if (!isExternal && partyDealers.some(d => d.job === c.job && d.userIndex !== -1)) continue;
        partyDealers.push(c);
      } else {
        if (partySupporters.length >= 1) continue;
        partySupporters.push(c);
      }

      party.push(c);
      partyUsers.add(c.userIndex);
      usedIds.add(c.id);

      if (party.length === 4) break;
    }

    if (
      party.length !== 4 ||
      partyDealers.length !== 3 ||
      partySupporters.length !== 1 ||
      hasConflict(party)
    ) {
      return { success: false };
    }

    result.push(party);
    party.forEach(c => usedUsers.add(c.userIndex));
  }

  return { success: true, raid: result };
};

// 외부 인원 포함 보완용 구성 함수
window.buildFallbackRaid = function (pool, numParties) {
  const result = [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const usedUsers = new Set();
  const usedIds = new Set();

  for (let i = 0; i < numParties; i++) {
    const party = [];
    const partyUsers = new Set();
    let partyDealers = [];
    let partySupporters = [];

    for (const c of shuffled) {
      if (usedIds.has(c.id)) continue;
      if (usedUsers.has(c.userIndex)) continue;
      if (partyUsers.has(c.userIndex)) continue;

      if (c.type === "딜러" && partyDealers.length < 3) {
        partyDealers.push(c);
      } else if (c.type === "서포터" && partySupporters.length < 1) {
        partySupporters.push(c);
      } else continue;

      party.push(c);
      partyUsers.add(c.userIndex);
      usedIds.add(c.id);

      if (party.length === 4) break;
    }

    result.push(party);
    party.forEach(c => usedUsers.add(c.userIndex));
  }

  return result;
};
