function clean(value) {
  return String(value ?? '').trim();
}

export function getLineupRaceNumber(lineup = {}) {
  return clean(lineup?.raceNumber || lineup?.raceNo || lineup?.race);
}

export function getLineupRoundInfo(lineup = {}) {
  const text = [
    lineup?.roundType,
    lineup?.roundLabel,
    lineup?.resultType,
    lineup?.mainLabel,
    lineup?.raceLabel,
  ].map(clean).filter(Boolean).join(' ');

  if (/\bmain\b|\bfinals?\b/i.test(text)) {
    return { type: 'main', number: 999, shortLabel: 'MAIN' };
  }

  const qualifier = text.match(/Qualifier\s+Round\s*(\d+)/i) || text.match(/\bQ\s*(\d+)\b/i);
  if (qualifier) {
    const number = Number(qualifier[1]) || 0;
    return { type: 'qualifier', number, shortLabel: number ? `Q${number}` : 'QUAL' };
  }

  const seeding = text.match(/Seeding\s+Round\s*(\d+)/i);
  if (seeding) {
    const number = Number(seeding[1]) || 0;
    return { type: 'seeding', number, shortLabel: number ? `S${number}` : 'SEED' };
  }

  const explicitNumber = Number(lineup?.roundNum || 0) || 0;
  const explicitType = clean(lineup?.roundType).toLowerCase();
  if (explicitType === 'main') return { type: 'main', number: 999, shortLabel: 'MAIN' };
  if (explicitType === 'qualifier') return { type: 'qualifier', number: explicitNumber, shortLabel: explicitNumber ? `Q${explicitNumber}` : 'QUAL' };

  return { type: explicitType, number: explicitNumber, shortLabel: '' };
}

function lineupUpdatedAt(lineup = {}) {
  return Number(
    lineup?.updatedAtMs ||
    lineup?.syncUpdatedAt ||
    Date.parse(lineup?.updatedAt || lineup?.createdAt || '') ||
    0
  ) || 0;
}

export function getLineupPriority(lineup = {}) {
  const round = getLineupRoundInfo(lineup);
  const hasRace = Boolean(getLineupRaceNumber(lineup));
  const usableScore = hasRace ? 10_000_000 : 0;
  const roundScore = round.type === 'main'
    ? 1_000_000
    : round.type === 'qualifier'
      ? 100_000 + Number(round.number || 0)
      : round.type === 'seeding'
        ? 10_000 + Number(round.number || 0)
        : Number(round.number || 0);

  return usableScore + roundScore;
}

// Returns the lineup that should be shown now:
// Main/final first, otherwise the highest qualifier round, then the newest
// same-round record. A record without a race number never hides one that has it.
export function pickPreferredLineup(current, candidate) {
  if (!current) return candidate || null;
  if (!candidate) return current || null;

  const currentPriority = getLineupPriority(current);
  const candidatePriority = getLineupPriority(candidate);
  if (candidatePriority > currentPriority) return candidate;
  if (currentPriority > candidatePriority) return current;

  const currentUpdated = lineupUpdatedAt(current);
  const candidateUpdated = lineupUpdatedAt(candidate);
  if (candidateUpdated > currentUpdated) return candidate;
  if (currentUpdated > candidateUpdated) return current;

  return Number(getLineupRaceNumber(candidate) || 0) >= Number(getLineupRaceNumber(current) || 0)
    ? candidate
    : current;
}
