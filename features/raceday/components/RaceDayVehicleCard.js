import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { buildCompareRows } from '../lib/raceDayCompare';
import { getVehicleDisplayName } from '../lib/raceDayModel';
import { pickPreferredLineup } from '../lib/raceDayLineupPriority';
import RaceDayLineupBadge from './RaceDayLineupBadge';
import { raceDayStyles } from '../styles/raceDayStyles';

function WrenchIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22.7 19.1 13.6 10a6.1 6.1 0 0 0-7.5-7.8l3.5 3.5-3.9 3.9-3.5-3.5A6.1 6.1 0 0 0 10 13.6l9.1 9.1a1 1 0 0 0 1.4 0l2.2-2.2a1 1 0 0 0 0-1.4Z"
        stroke="#2F8CFF"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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

  const qualifierMatch = roundLabel.match(/Qualifier\s+Round\s*(\d+)/i);
  if (qualifierMatch) {
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
      const roundNum = isMain ? 999 : Number(qMatch?.[1] || 0);

      return {
        raceNumber,
        raceLabel: `Race ${raceNumber}`,
        roundLabel: isMain ? (run?.mainLabel || roundLabel || 'Main') : (roundLabel || (roundNum ? `Qualifier Round ${roundNum}` : '')),
        roundType: isMain ? 'main' : (roundNum ? 'qualifier' : ''),
        roundNum,
        source: 'race-results-fallback',
      };
    })
    .filter(Boolean);

  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const ap = a.roundType === 'main' ? 10000 : Number(a.roundNum || 0);
    const bp = b.roundType === 'main' ? 10000 : Number(b.roundNum || 0);
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
  const raceRuns = useMemo(() => {
    const list = Array.isArray(runsForVehicle) && runsForVehicle.length
      ? runsForVehicle
      : (latestRun ? [latestRun] : []);

    return list.filter(Boolean);
  }, [runsForVehicle, latestRun]);
  const displayLineup = useMemo(
    () => pickPreferredLineup(lineup, getLineupFromRunList(raceRuns)),
    [lineup, raceRuns],
  );

  return (
    <View style={raceDayStyles.raceVehicleCard}>
      <View style={raceDayStyles.cardAccent} />

      <View style={raceDayStyles.raceVehicleHeader}>
        <View style={raceDayStyles.raceVehicleMain}>
          <RaceDayLineupBadge lineup={displayLineup} />
          <View style={raceDayStyles.raceVehicleIdentity}>
            <Text style={raceDayStyles.cardTitle}>{title}</Text>
            <Text style={raceDayStyles.raceVehicleMeta} numberOfLines={1}>
              {vehicle?.manufacturer || vehicle?.model ? [vehicle.manufacturer, vehicle.model].filter(Boolean).join(' ') : 'Manufacturer / Model not set'}
            </Text>
          </View>
        </View>
        <View style={raceDayStyles.raceVehicleActions}>
          <TouchableOpacity style={raceDayStyles.raceVehicleWrench} onPress={onOpenSetup} activeOpacity={0.82}>
            <WrenchIcon />
            <Text style={raceDayStyles.raceVehicleWrenchText}>WRENCH</Text>
          </TouchableOpacity>
        </View>
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
