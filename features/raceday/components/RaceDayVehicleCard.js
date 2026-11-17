import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { buildCompareRows } from '../lib/raceDayCompare';
import { getVehicleDisplayName, getVehicleTransponder } from '../lib/raceDayModel';
import { pickPreferredLineup } from '../lib/raceDayLineupPriority';
import RaceDayLineupBadge from './RaceDayLineupBadge';
import { raceDayColors, raceDayStyles } from '../styles/raceDayStyles';

function RaceRunStat({ label, value }) {
  return (
    <View style={raceDayStyles.raceRunStatBox}>
      <Text style={raceDayStyles.raceRunStatLabel} numberOfLines={1}>{label}</Text>
      <Text style={raceDayStyles.raceRunStatValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function getRunTitle(run = {}) {
  const roundLabel = String(run.roundLabel || '').trim();
  const mainLabel = String(run.mainLabel || '').trim();

  let title = 'Race Result';

  const seedingMatch = roundLabel.match(/Seeding\s+Round\s*(\d+)/i);
  const qualifierMatch = roundLabel.match(/Qualifier\s+Round\s*(\d+)/i);
  if (seedingMatch) {
    title = `S${seedingMatch[1]}`;
  } else if (qualifierMatch) {
    title = `Q${qualifierMatch[1]}`;
  } else if (/main|final/i.test(roundLabel)) {
    title = mainLabel || 'Main';
  } else if (roundLabel) {
    title = roundLabel;
  }

  if (run.raceNumber) return `${title} • Race ${run.raceNumber}`;
  return title;
}

function RaceRunCard({ run, compareFields, onOpenResults }) {
  const rows = buildCompareRows(run, compareFields);

  return (
    <View style={raceDayStyles.raceRunCardThin}>
      <View style={raceDayStyles.raceRunTopRow}>
        <Text style={raceDayStyles.raceRunTitleThin} numberOfLines={1}>{getRunTitle(run)}</Text>
        <TouchableOpacity style={raceDayStyles.resultsMiniButton} onPress={() => onOpenResults?.(run)} activeOpacity={0.82}>
          <Text style={raceDayStyles.resultsMiniButtonText}>Results</Text>
        </TouchableOpacity>
      </View>

      <View style={raceDayStyles.raceRunStatsRow}>
        {rows.map((row) => (
          <RaceRunStat
            key={`${run.id || run.raceUrl || getRunTitle(run)}_${row.key}`}
            label={row.label}
            value={row.value}
          />
        ))}
      </View>
    </View>
  );
}


function getLineupFromRunList(runs = []) {
  const list = Array.isArray(runs) ? runs.filter(Boolean) : [];
  if (!list.length) return null;

  const candidates = list
    .map((run) => {
      const roundLabel = String(run?.roundLabel || run?.resultType || '').trim();
      const raceNumber = String(run?.raceNumber || run?.raceNo || run?.race || '').trim();
      if (!raceNumber) return null;

      const isMain = /main|final/i.test(roundLabel) || /main|final/i.test(String(run?.resultType || ''));
      const qMatch = roundLabel.match(/Qualifier\s+Round\s*(\d+)/i) || roundLabel.match(/\bQ\s*(\d+)\b/i);
      const sMatch = roundLabel.match(/Seeding\s+Round\s*(\d+)/i) || roundLabel.match(/\bS\s*(\d+)\b/i);
      const roundNum = isMain ? 999 : Number(qMatch?.[1] || sMatch?.[1] || 0);
      const roundType = isMain ? 'main' : (qMatch ? 'qualifier' : (sMatch ? 'seeding' : ''));

      return {
        raceNumber,
        raceLabel: `Race ${raceNumber}`,
        roundLabel: isMain ? (run?.mainLabel || roundLabel || 'Main') : (roundLabel || (roundType === 'seeding' ? `Seeding Round ${roundNum}` : (roundNum ? `Qualifier Round ${roundNum}` : ''))),
        roundType,
        roundNum,
        source: 'race-results-fallback',
      };
    })
    .filter(Boolean);

  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const ap = a.roundType === 'main' ? 1_000_000 : a.roundType === 'qualifier' ? 100_000 + Number(a.roundNum || 0) : a.roundType === 'seeding' ? 10_000 + Number(a.roundNum || 0) : Number(a.roundNum || 0);
    const bp = b.roundType === 'main' ? 1_000_000 : b.roundType === 'qualifier' ? 100_000 + Number(b.roundNum || 0) : b.roundType === 'seeding' ? 10_000 + Number(b.roundNum || 0) : Number(b.roundNum || 0);
    if (bp !== ap) return bp - ap;
    return Number(b.raceNumber || 0) - Number(a.raceNumber || 0);
  });
  return candidates[0] || null;
}

export default function RaceDayVehicleCard({
  vehicle,
  latestRun,
  runsForVehicle = [],
  lineup = null,
  compareFields,
  onOpenResults,
  onOpenSetup,
}) {
  const title = getVehicleDisplayName(vehicle);
  const transponder = getVehicleTransponder(vehicle);
  const raceRuns = useMemo(() => {
    const list = Array.isArray(runsForVehicle) && runsForVehicle.length
      ? runsForVehicle
      : (latestRun ? [latestRun] : []);

    const stage = (run = {}) => {
      const label = `${run.roundLabel || ''} ${run.resultType || ''}`;
      if (/seed/i.test(label)) return 1;
      if (/qual/i.test(label)) return 2;
      if (/main|final/i.test(label)) return 3;
      return 0;
    };
    const number = (run = {}) => Number(String(run.roundLabel || '').match(/(?:Seeding|Qualifier)\s+Round\s*(\d+)/i)?.[1] || 0);
    return list.filter(Boolean).slice().sort((a, b) => (stage(a) - stage(b)) || (number(a) - number(b)));
  }, [runsForVehicle, latestRun]);
  const displayLineup = useMemo(
    () => pickPreferredLineup(lineup, getLineupFromRunList(raceRuns)),
    [lineup, raceRuns],
  );

  return (
    <View style={[raceDayStyles.card, raceDayStyles.dashboardCardCompact]}>
      <View style={raceDayStyles.cardAccent} />

      <View style={raceDayStyles.rowBetween}>
        <View style={[raceDayStyles.flex1, { flexDirection: 'row', alignItems: 'center', minWidth: 0 }]}>
          <RaceDayLineupBadge lineup={displayLineup} />
          <View style={raceDayStyles.flex1}>
            <Text style={raceDayStyles.cardTitle}>{title}</Text>
            <Text style={raceDayStyles.cardSub}>
              {vehicle?.manufacturer || vehicle?.model ? [vehicle.manufacturer, vehicle.model].filter(Boolean).join(' ') : 'Race vehicle'}
              {transponder ? ` • TX ${transponder}` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={[raceDayStyles.smallButton, { borderColor: raceDayColors.accent }]} onPress={onOpenSetup} activeOpacity={0.82}>
          <Text style={raceDayStyles.smallButtonText}>Wrench</Text>
        </TouchableOpacity>
      </View>

      {raceRuns.length ? (
        <View style={raceDayStyles.raceRunList}>
          {raceRuns.map((run, index) => (
            <RaceRunCard
              key={run.id || `${run.raceUrl || 'race'}_${run.roundLabel || 'round'}_${run.raceNumber || index}`}
              run={run}
              compareFields={compareFields}
              onOpenResults={onOpenResults}
            />
          ))}
        </View>
      ) : (
        <Text style={[raceDayStyles.cardSub, { marginTop: 8 }]}>No results synced yet</Text>
      )}
    </View>
  );
}

export { RaceDayVehicleCard };
