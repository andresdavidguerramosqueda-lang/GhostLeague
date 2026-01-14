// Utilidad para generar un bracket de eliminación directa
// cumpliendo el spec de seeding, byes y lados A/B.

/**
 * @typedef {{ id: string, name: string, seed?: number }} BracketParticipant
 * @typedef {{ round: number, playerA: any, playerB: any, winner: any }} BracketResult
 */

/**
 * Genera la estructura de bracket para un torneo de eliminación directa.
 *
 * @param {Object} params
 * @param {string} params.tournamentId
 * @param {string} params.tournamentName
 * @param {BracketParticipant[]} params.participants
 * @param {boolean} params.allowByes
 * @param {"seeded"|"random"} params.seedingMethod
 * @param {{ leftLabel: string, rightLabel: string }} params.sides
 * @param {BracketResult[]} params.results - resultados actuales del torneo
 */
export function generateEliminationBracket({
  tournamentId,
  tournamentName,
  participants,
  allowByes,
  seedingMethod,
  sides,
  results,
}) {
  if (!Array.isArray(participants) || participants.length < 2) {
    throw new Error('Se requieren al menos 2 participantes');
  }

  const ids = new Set();
  participants.forEach((p) => {
    const id = p && p.id != null ? String(p.id) : null;
    if (!id) {
      throw new Error('Todos los participantes deben tener id');
    }
    if (ids.has(id)) {
      throw new Error('Existen participantes duplicados');
    }
    ids.add(id);
  });

  const baseCount = participants.length;
  if (baseCount % 2 === 1 && !allowByes) {
    throw new Error('Número impar de participantes y allowByes=false');
  }

  const allowedSizes = [2, 4, 8, 16, 32, 64];
  let slots = allowedSizes.find((n) => n >= baseCount) || null;
  if (!slots) {
    throw new Error('Número de participantes no soportado');
  }

  if (!allowedSizes.includes(baseCount)) {
    if (!allowByes) {
      throw new Error('El número de participantes no es potencia de 2 y allowByes=false');
    }
  } else {
    slots = baseCount;
  }

  const list = participants.map((p) => ({ ...p, id: String(p.id) }));

  if (seedingMethod === 'seeded') {
    list.sort((a, b) => {
      const sa = typeof a.seed === 'number' ? a.seed : Number.POSITIVE_INFINITY;
      const sb = typeof b.seed === 'number' ? b.seed : Number.POSITIVE_INFINITY;
      if (sa === sb) {
        return String(a.id).localeCompare(String(b.id));
      }
      return sa - sb;
    });
  } else {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
  }

  const participantsById = new Map();
  list.forEach((p) => {
    participantsById.set(String(p.id), p);
  });

  const slotsIds = [];
  for (let i = 0; i < slots; i += 1) {
    if (i < list.length) {
      slotsIds.push(String(list[i].id));
    } else {
      slotsIds.push(null);
    }
  }

  const totalRounds = Math.log2(slots);

  const roundsMeta = [];
  for (let r = 1; r <= totalRounds; r += 1) {
    const matchCount = slots / Math.pow(2, r);
    let roundName;

    if (r === totalRounds) {
      roundName = 'Final';
    } else if (r === totalRounds - 1) {
      roundName = 'Semi-Finals';
    } else if (r === totalRounds - 2 && slots >= 8) {
      roundName = 'Quarter-Finals';
    } else if (slots === 4 && r === 1) {
      roundName = 'Semi-Finals';
    } else if (slots === 8 && r === 1) {
      roundName = 'Quarter-Finals';
    } else if (slots === 16 && r === 1) {
      roundName = 'Round of 16';
    } else if (slots === 32 && r === 1) {
      roundName = 'Round of 32';
    } else if (slots === 64 && r === 1) {
      roundName = 'Round of 64';
    } else {
      roundName = `Round ${r}`;
    }

    roundsMeta.push({ roundIndex: r, roundName, matchCount });
  }

  const normalizedResults = Array.isArray(results)
    ? results.map((r) => {
        const round = r && typeof r.round === 'number' ? r.round : 1;
        const playerA = r && r.playerA && r.playerA._id
          ? String(r.playerA._id)
          : r && r.playerA
          ? String(r.playerA)
          : null;
        const playerB = r && r.playerB && r.playerB._id
          ? String(r.playerB._id)
          : r && r.playerB
          ? String(r.playerB)
          : null;
        const winner = r && r.winner && r.winner._id
          ? String(r.winner._id)
          : r && r.winner
          ? String(r.winner)
          : null;
        return { round, playerA, playerB, winner };
      })
    : [];

  const findResult = (round, aId, bId) => {
    if (!aId || !bId) return null;
    for (let i = 0; i < normalizedResults.length; i += 1) {
      const r = normalizedResults[i];
      if (r.round !== round) continue;
      const sameOrder = r.playerA === aId && r.playerB === bId;
      const swappedOrder = r.playerA === bId && r.playerB === aId;
      if (sameOrder || swappedOrder) {
        return r;
      }
    }
    return null;
  };

  const allRoundsMatches = [];
  const winnersByRound = [];

  const round1Matches = [];
  const matchCount1 = slots / 2;
  for (let i = 0; i < matchCount1; i += 1) {
    const idxA = i;
    const idxB = slots - 1 - i;
    const aId = slotsIds[idxA];
    const bId = slotsIds[idxB];
    round1Matches.push({ teamAId: aId, teamBId: bId });
  }
  allRoundsMatches.push(round1Matches);

  for (let r = 2; r <= totalRounds; r += 1) {
    const prevMatches = allRoundsMatches[r - 2];
    const matchCount = prevMatches.length / 2;
    const matches = [];
    for (let i = 0; i < matchCount; i += 1) {
      matches.push({ teamAId: null, teamBId: null });
    }
    allRoundsMatches.push(matches);
  }

  const matchesOutput = [];

  for (let r = 1; r <= totalRounds; r += 1) {
    const roundMatches = allRoundsMatches[r - 1];
    const winners = [];
    const meta = roundsMeta[r - 1];
    const matchCount = roundMatches.length;
    const half = matchCount / 2;

    for (let i = 0; i < matchCount; i += 1) {
      let teamAId;
      let teamBId;

      if (r === 1) {
        teamAId = roundMatches[i].teamAId;
        teamBId = roundMatches[i].teamBId;
      } else {
        const prevWinners = winnersByRound[r - 2];
        const child1 = prevWinners[2 * i] || null;
        const child2 = prevWinners[2 * i + 1] || null;
        teamAId = child1;
        teamBId = child2;
      }

      const baseTeamA = teamAId ? participantsById.get(String(teamAId)) : null;
      const baseTeamB = teamBId ? participantsById.get(String(teamBId)) : null;

      const teamA = baseTeamA
        ? { id: baseTeamA.id, name: baseTeamA.name, seed: baseTeamA.seed }
        : null;
      const teamB = baseTeamB
        ? { id: baseTeamB.id, name: baseTeamB.name, seed: baseTeamB.seed }
        : null;

      const result =
        teamAId && teamBId ? findResult(r, String(teamAId), String(teamBId)) : null;
      const winnerId = result && result.winner ? String(result.winner) : null;

      if (winnerId) {
        winners.push(winnerId);
      } else {
        winners.push(null);
      }

      let side = 'Final';
      let position = 1;
      if (r < totalRounds) {
        side = i < half ? 'A' : 'B';
        position = side === 'A' ? i + 1 : i - half + 1;
      }

      const matchId = `R${r}-M${i + 1}`;

      matchesOutput.push({
        matchId,
        roundIndex: r,
        roundName: meta.roundName,
        side,
        position,
        teamA,
        teamB,
        winnerId,
      });
    }

    winnersByRound.push(winners);
  }

  return {
    tournamentId,
    tournamentName,
    totalParticipants: baseCount,
    bracket: {
      rounds: roundsMeta,
      matches: matchesOutput,
    },
    sides: {
      A: sides.leftLabel,
      B: sides.rightLabel,
    },
  };
}
