import { onValue, ref, runTransaction } from "firebase/database";
import { database, signIn } from "./firebase.js";
import { validSessionState } from "./session-state.js";

const sessionPath = "sessions/default";

export const groupingModes = {
  individual: "individual",
  pairs: "pairs",
  threes: "threes",
  twoTeams: "two-teams",
  custom: "custom",
};

export const participationModes = {
  simultaneous: "simultaneous",
  turnBased: "turn-based",
};

export function createGroups(players, mode, random = Math.random, custom = []) {
  const ids = players.map((player) => player.id);
  if (mode === groupingModes.custom) {
    return custom.map((group, index) => ({
      id: group.id ?? `group-${index + 1}`,
      name: group.name ?? `GROUP ${index + 1}`,
      memberIds: [...(group.memberIds ?? [])],
    }));
  }

  const shuffled = shuffle(ids, random);
  if (mode === groupingModes.twoTeams) {
    const firstTeamSize = Math.ceil(shuffled.length / 2);
    return [
      {
        id: "group-1",
        name: "TEAM 1",
        memberIds: shuffled.slice(0, firstTeamSize),
      },
      {
        id: "group-2",
        name: "TEAM 2",
        memberIds: shuffled.slice(firstTeamSize),
      },
    ];
  }

  if (mode === groupingModes.pairs) {
    return createPairGroups(shuffled);
  }

  const size =
    mode === groupingModes.individual
      ? 1
      : mode === groupingModes.threes
        ? 3
        : 2;
  return chunk(shuffled, size).map((memberIds, index) => ({
    id: `group-${index + 1}`,
    name:
      mode === groupingModes.individual
        ? `PLAYER ${index + 1}`
        : mode === groupingModes.pairs
          ? `PAIR ${index + 1}`
          : `GROUP ${index + 1}`,
    memberIds,
  }));
}

export function reassignPlayer(groups, playerId, groupId, mode) {
  if (!groups?.[groupId]) return groups;
  const updated = Object.fromEntries(
    Object.entries(groups).map(([id, group]) => [
      id,
      {
        ...group,
        memberIds: (group.memberIds ?? []).filter((memberId) => memberId !== playerId),
      },
    ]),
  );
  updated[groupId] = {
    ...updated[groupId],
    memberIds: [...updated[groupId].memberIds, playerId],
  };
  if (mode !== groupingModes.twoTeams) {
    for (const [id, group] of Object.entries(updated)) {
      if (id !== groupId && group.memberIds.length === 0) delete updated[id];
    }
  }
  return updated;
}

export function nextActiveGroupId(groups, activeGroupId, direction = 1) {
  const available = groups.filter((group) => (group.memberIds ?? []).length > 0);
  if (!available.length) return undefined;
  const current = available.findIndex((group) => group.id === activeGroupId);
  const start = current < 0 ? 0 : current;
  return available[
    (start + direction + available.length) % available.length
  ].id;
}

export function playerGroupLabel(group, mode) {
  if (mode === groupingModes.twoTeams) return "YOUR TEAM";
  return group?.memberIds?.length === 2 ? "YOUR PAIR" : "YOUR GROUP";
}

export function creditGroupMembers(players, group, points, generation) {
  const updated = { ...players };
  for (const playerId of group.memberIds ?? []) {
    const player = updated[playerId];
    if (!player || player.generation !== generation) continue;
    updated[playerId] = {
      ...player,
      score: (player.score ?? 0) + points,
    };
  }
  return updated;
}

export function connectedPlayers(session, generation) {
  return Object.entries(session.players ?? {})
    .filter(
      ([id, player]) =>
        player.generation === generation &&
        Object.values(session.connections?.[id] ?? {}).some(
          (connection) => connection?.generation === generation,
        ),
    )
    .map(([id, player]) => ({ id, ...player }));
}

export async function generateGrouping(
  mode,
  participation = participationModes.simultaneous,
) {
  await signIn();
  return runTransaction(ref(database, sessionPath), (session) => {
    const current = session ?? {};
    const state = validSessionState(current.state);
    const players = connectedPlayers(current, state.generation);
    if (!players.length) return;
    const groups = createGroups(players, mode);
    return {
      ...current,
      grouping: {
        mode,
        participation,
        groups: Object.fromEntries(groups.map((group) => [group.id, group])),
        activeGroupId: groups[0]?.id ?? null,
        showAssignments: current.grouping?.showAssignments ?? false,
        createdAt: Date.now(),
      },
    };
  });
}

export async function movePlayerToGroup(playerId, groupId) {
  return transactGrouping((grouping) => {
    if (!grouping.groups?.[groupId]) return;
    const groups = reassignPlayer(
      grouping.groups,
      playerId,
      groupId,
      grouping.mode,
    );
    const activeGroupId = groups[grouping.activeGroupId]
      ? grouping.activeGroupId
      : Object.keys(groups)[0] ?? null;
    return { ...grouping, groups, activeGroupId, editedAt: Date.now() };
  });
}

export async function setActiveGroup(groupId) {
  return transactGrouping((grouping) =>
    grouping.groups?.[groupId]
      ? { ...grouping, activeGroupId: groupId }
      : undefined,
  );
}

export async function setGroupingPresentation(showAssignments) {
  return transactGrouping((grouping) => ({
    ...grouping,
    showAssignments: Boolean(showAssignments),
  }));
}

export async function awardGroupPoints(groupId, points) {
  const award = Number(points);
  if (!Number.isFinite(award)) throw new Error("Points must be a number");
  await signIn();
  return runTransaction(ref(database, sessionPath), (session) => {
    const current = session ?? {};
    const state = validSessionState(current.state);
    const group = current.grouping?.groups?.[groupId];
    if (!group || state.phase === "lobby") return;
    const players = creditGroupMembers(
      current.players ?? {},
      group,
      award,
      state.generation,
    );
    const awardId = `award-${Date.now()}`;
    return {
      ...current,
      players,
      round: {
        ...current.round,
        groupAwards: {
          ...(current.round?.groupAwards ?? {}),
          [awardId]: {
            groupId,
            groupName: group.name,
            memberIds: group.memberIds ?? [],
            points: award,
            awardedAt: Date.now(),
          },
        },
      },
    };
  });
}

export async function observeGrouping(onChange) {
  await signIn();
  return onValue(ref(database, sessionPath), (snapshot) => {
    const session = snapshot.val() ?? {};
    const grouping = session.grouping ?? {};
    const players = session.players ?? {};
    const groups = Object.values(grouping.groups ?? {}).map((group) => ({
      ...group,
      members: (group.memberIds ?? []).map((id) => ({
        id,
        name: session.lockedNames?.[id] ?? players[id]?.name ?? "Unknown",
      })),
    }));
    onChange({
      ...grouping,
      groups,
      activeGroup: groups.find((group) => group.id === grouping.activeGroupId),
    });
  });
}

async function transactGrouping(update) {
  await signIn();
  return runTransaction(ref(database, sessionPath), (session) => {
    const current = session ?? {};
    const grouping = update(current.grouping ?? {});
    return grouping ? { ...current, grouping } : undefined;
  });
}

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function chunk(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function createPairGroups(shuffled) {
  const remaining = [...shuffled];
  const groups = [];
  while (remaining.length > 3) {
    groups.push(remaining.splice(0, 2));
  }
  if (remaining.length) groups.push(remaining);
  return groups.map((memberIds, index) => ({
    id: `group-${index + 1}`,
    name: `PAIR ${index + 1}`,
    memberIds,
  }));
}
