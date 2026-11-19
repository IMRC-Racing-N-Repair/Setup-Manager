import React, { useMemo, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { buildCompareRows, getCompareValue } from '../lib/raceDayCompare';
import { getVehicleDisplayName, getVehicleTransponder } from '../lib/raceDayModel';
import { pickPreferredLineup } from '../lib/raceDayLineupPriority';
import RaceDayLineupBadge from './RaceDayLineupBadge';
import RaceDayLapChart from './RaceDayLapChart';
import { raceDayDesktopStyles as desktopStyles } from '../styles/raceDayDesktopStyles';
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

export function RaceRunStat({ label, value, desktop }) {
  return (
    <View style={[
      raceDayStyles.raceRunStatBox,
      desktop && desktopStyles.stat,
      Platform.OS === 'web' && !desktop && raceDayStyles.webRunStat,
    ]}>
      <Text style={[raceDayStyles.raceRunStatLabel, desktop && desktopStyles.statLabel]} numberOfLines={1}>{label}</Text>
      <Text style={[raceDayStyles.raceRunStatValue, desktop && desktopStyles.statValue]} numberOfLines={1}>{value}</Text>
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

function RaceRunCard({ run, compareFields, onOpenResults, desktop, first }) {
  const [expanded, setExpanded] = useState(false);
  const mobileWeb = Platform.OS === 'web' && !desktop;
  const rows = buildCompareRows(run, compareFields);
  const position = desktop || mobileWeb ? getCompareValue(run, 'position') : '—';
  const showPosition = position !== '—' && !rows.some((row) => row.key === 'position');

  return (
    <View style={[raceDayStyles.raceRunCardThin, desktop && desktopStyles.run, desktop && first && desktopStyles.firstRun]}>
      <View style={raceDayStyles.raceRunTopRow}>
        <View style={raceDayStyles.flex1}>
          <Text style={[raceDayStyles.raceRunTitleThin, desktop && desktopStyles.runTitle, mobileWeb && raceDayStyles.webRunTitle]}>{getRunTitle(run)}</Text>
          {!!run.className && <Text style={[raceDayStyles.raceRunSub, desktop && desktopStyles.runClass]}>{run.className}</Text>}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          aria-expanded={expanded}
          style={[raceDayStyles.resultsMiniButton, desktop && desktopStyles.resultsButton, mobileWeb && raceDayStyles.webResultsButton]}
          onPress={() => setExpanded((value) => !value)}
        >
          <Text style={[raceDayStyles.resultsMiniButtonText, desktop && desktopStyles.resultsButtonText]}>{expanded ? 'Hide laps' : 'Lap chart'}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[raceDayStyles.resultsMiniButton, desktop && desktopStyles.resultsButton, mobileWeb && raceDayStyles.webResultsButton]} onPress={() => onOpenResults?.(run)} activeOpacity={0.82}>
          <Text style={[raceDayStyles.resultsMiniButtonText, desktop && desktopStyles.resultsButtonText]}>Results</Text>
        </TouchableOpacity>
      </View>

      <View style={[raceDayStyles.raceRunStatsRow, desktop && desktopStyles.runStats, mobileWeb && raceDayStyles.webRunStats]}>
        {showPosition && <RaceRunStat desktop={desktop} label="Position" value={position} />}
        {rows.map((row) => (
          <RaceRunStat key={row.key} label={row.label} value={row.value} desktop={desktop} />
        ))}
      </View>
      {expanded && <RaceDayLapChart run={run} />}
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

const vehicleColors = ['#8ABAFF', '#E7A8FB', '#79DBC5', '#FBB48C', '#C4BBFF', '#B5D58A'];

function vehicleColor(vehicle, title) {
  const key = String(vehicle?.id || vehicle?.vehicleId || title);
  let hash = 0;
  for (const letter of key) hash = (Math.imul(31, hash) + letter.codePointAt(0)) >>> 0;
  return vehicleColors[hash % vehicleColors.length];
}

export function RaceDayVehicleCardFrame({ vehicle, desktop, lineup, onOpenSetup, children }) {
  const title = getVehicleDisplayName(vehicle);
  const model = [vehicle?.manufacturer, vehicle?.model].filter(Boolean).join(' ');
  const transponder = getVehicleTransponder(vehicle);
  const identity = [model, vehicle?.chassisStyle || vehicle?.vehicleStyle, transponder && `TX ${transponder}`].filter(Boolean).join(' · ');
  const mobileWeb = Platform.OS === 'web' && !desktop;
  const accent = desktop || mobileWeb ? vehicleColor(vehicle, title) : null;
  return (
    <View style={[raceDayStyles.raceVehicleCard, desktop && desktopStyles.vehicle, mobileWeb && raceDayStyles.webVehicleCard, accent && { borderLeftWidth: 4, borderLeftColor: accent }]}>
      {!accent && <View style={raceDayStyles.cardAccent} />}

      <View style={[raceDayStyles.raceVehicleHeader, desktop && desktopStyles.vehicleHeader]}>
        <View style={raceDayStyles.raceVehicleMain}>
          {desktop && (
            <View aria-hidden style={[desktopStyles.vehicleMarker, { borderColor: accent + '64', backgroundColor: accent + '20' }]}>
              <Text style={[desktopStyles.vehicleInitials, { color: accent }]}>{title.trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase()}</Text>
            </View>
          )}
          {!desktop && <RaceDayLineupBadge lineup={lineup} />}
          <View style={raceDayStyles.raceVehicleIdentity}>
            <Text style={[raceDayStyles.cardTitle, desktop && desktopStyles.vehicleTitle]}>{title}</Text>
            <Text style={[raceDayStyles.raceVehicleMeta, desktop && desktopStyles.vehicleMeta]} numberOfLines={1}>
              {desktop || mobileWeb ? identity || 'Vehicle' : model || 'Manufacturer / Model not set'}
            </Text>
          </View>
        </View>
        {desktop && <RaceDayLineupBadge lineup={lineup} desktop />}
        <View style={raceDayStyles.raceVehicleActions}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={desktop ? `Open setup for ${title}` : undefined} style={[raceDayStyles.raceVehicleWrench, desktop && desktopStyles.setupButton]} onPress={onOpenSetup} activeOpacity={0.82}>
            <WrenchIcon />
            <Text style={[raceDayStyles.raceVehicleWrenchText, desktop && desktopStyles.vehicleAction]}>WRENCH</Text>
          </TouchableOpacity>
        </View>
      </View>

      {children}
    </View>
  );
}

export default function RaceDayVehicleCard({
  vehicle,
  desktop = false,
  latestRun,
  runsForVehicle = [],
  lineup = null,
  compareFields,
  onOpenResults,
  onOpenSetup,
}) {
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
    <RaceDayVehicleCardFrame vehicle={vehicle} desktop={desktop} lineup={displayLineup} onOpenSetup={onOpenSetup}>
      {raceRuns.length ? (
        <View style={[raceDayStyles.raceRunList, desktop && desktopStyles.vehicleRuns]}>
          {raceRuns.map((run, index) => (
            <RaceRunCard
              key={run.id || `${run.raceUrl || 'race'}_${run.roundLabel || 'round'}_${run.raceNumber || index}`}
              run={run}
              first={index === 0}
              desktop={desktop}
              compareFields={compareFields}
              onOpenResults={onOpenResults}
            />
          ))}
        </View>
      ) : (
        <Text style={[raceDayStyles.cardSub, { marginTop: 8 }, desktop && desktopStyles.vehicleEmpty]}>No results synced yet</Text>
      )}
    </RaceDayVehicleCardFrame>
  );
}

export { RaceDayVehicleCard };
