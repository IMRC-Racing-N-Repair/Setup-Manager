import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Platform } from 'react-native';
import RaceDayDesktopStandings from '../features/raceday/components/RaceDayDesktopStandings';
import { fetchLiveRcText } from '../features/raceday/lib/liverc/liveRcClient';
import { parseEventsFromHtml } from '../features/raceday/lib/liverc/liveRcEventFinder';
import { stripTags } from '../features/raceday/lib/liverc/liveRcHtml';
import { buildRaceResultsForRun } from '../features/raceday/lib/liverc/liveRcRaceResultsParser';
import { parseRaceLinks } from '../features/raceday/lib/liverc/liveRcRaceScanner';
import useViewport from '../src/layout/useViewport';
import { DESKTOP_WEB_MIN_WIDTH } from '../src/layout/desktopWorkspace';
import { AppColors } from '../src/theme/colors';

const defaultTrack = 'https://prwevents.liverc.com';
const statColumns = [
  ['lapsTime', 'Laps/Time'], ['fastestLap', 'Fast Lap'], ['avgLap', 'Avg Lap'],
  ['top5Avg', 'Avg Top 5'], ['top10Avg', 'Avg Top 10'], ['top15Avg', 'Avg Top 15'],
  ['top2Consecutive', 'Top 2 Cons.'], ['top3Consecutive', 'Top 3 Cons.'],
  ['stdDeviation', 'Std Dev'], ['consistency', 'Consistency'],
];

function trackOrigin(input) {
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!url.hostname.endsWith('.liverc.com') || url.username || url.password || url.port) return '';
    return `https://${url.hostname}`;
  } catch {
    return '';
  }
}

async function loadTrack(origin) {
  const listUrl = `${origin}/events/`;
  const html = await fetchLiveRcText(listUrl);
  const title = stripTags(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').split(' :: ')[0];
  return { title: title || new URL(origin).hostname, events: parseEventsFromHtml(html, listUrl) };
}

async function loadRaces(eventUrl) {
  const html = await fetchLiveRcText(eventUrl);
  return parseRaceLinks(html, eventUrl).filter(({ raceUrl }) => {
    const url = new URL(raceUrl);
    return url.origin === new URL(eventUrl).origin && url.searchParams.get('p') === 'view_race_result';
  });
}

function loadStandings(raceUrl) {
  return buildRaceResultsForRun({ raceUrl }, { includeAll: true });
}

function useLiveRcResource(url, read, revision = 0) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!url) return;
    let active = true;
    read(url).then(
      (data) => { if (active) setResult({ url, revision, data }); },
      (error) => { if (active) setResult({ url, revision, error: error.message || 'LiveRC could not be reached.' }); },
    );
    return () => { active = false; };
  }, [url, read, revision]);
  return result && result.url === url && result.revision === revision ? result : {};
}

function RaceStatus({ result, loading, empty }) {
  if (result.error) return <p role="alert" className="lr-error">{result.error} Use Refresh to try again.</p>;
  if (!result.data) return <p role="status" className="lr-muted">{loading}</p>;
  return empty ? <p className="lr-muted">{empty}</p> : null;
}

function driverKey(row, index) {
  return `${row.displayPosition ?? index}-${row.driver || row.driverName}-${index}`;
}

function displayPosition(row) {
  return row.displayPosition ?? row.position ?? '—';
}

function buildStats(row = {}) {
  return statColumns.map(([key, label]) => ({ key, label, value: row[key] }));
}

function TrackResults({ origin, revision }) {
  const { width } = useViewport();
  const track = useLiveRcResource(origin, loadTrack, revision);
  const [eventUrl, setEventUrl] = useState('');
  const [round, setRound] = useState('');
  const [raceUrl, setRaceUrl] = useState('');
  const events = track.data?.events || [];
  const event = events.find((item) => item.eventUrl === eventUrl) || events[0];
  const results = useLiveRcResource(event?.eventUrl, loadRaces, revision);
  const races = results.data || [];
  const rounds = [...new Set(races.map((race) => race.roundLabel))];
  const filteredRaces = round ? races.filter((race) => race.roundLabel === round) : races;
  const race = filteredRaces.find((item) => item.raceUrl === raceUrl) || filteredRaces[0];
  const standings = useLiveRcResource(race?.raceUrl, loadStandings, revision);
  const drivers = standings.data || [];

  return (
    <>
      <header className="lr-track">
        <h2>{track.data?.title || new URL(origin).hostname}</h2>
        <div className="lr-links">
          <a href={`${origin}/live/`}>Live broadcast</a>
          <a href={`${origin}/practice/`}>Practice sessions</a>
          <a href={origin}>Track on LiveRC</a>
        </div>
      </header>
      {!events.length ? <RaceStatus result={track} loading="Loading LiveRC events…" empty="No events are listed for this track." /> : (
        <div className="lr-workspace">
          <section className="lr-card lr-pickers" aria-label="Choose a race">
            <label>Event
              <select value={event.eventUrl} onChange={(e) => { setEventUrl(e.target.value); setRound(''); setRaceUrl(''); }}>
                {events.map((item) => <option key={item.id} value={item.eventUrl}>{[item.title, item.dateLabel].filter(Boolean).join(' · ')}</option>)}
              </select>
            </label>
            {races.length ? (
              <>
                <label>Round
                  <select value={round} onChange={(e) => { setRound(e.target.value); setRaceUrl(''); }}>
                    <option value="">All rounds</option>
                    {rounds.map((label) => <option key={label}>{label}</option>)}
                  </select>
                </label>
                <label>Race
                  <select value={race?.raceUrl || ''} onChange={(e) => setRaceUrl(e.target.value)}>
                    {filteredRaces.map((item) => <option key={item.raceUrl} value={item.raceUrl}>{item.raceTitle}</option>)}
                  </select>
                </label>
              </>
            ) : <RaceStatus result={results} loading="Loading races…" empty="No completed races are listed for this event." />}
            <a href={event.eventUrl}>Event on LiveRC</a>
          </section>
          {race && (
            <section className="lr-card lr-result" aria-label="Race results">
              <div className="lr-result-header">
                <div><span className="lr-round">{race.roundLabel}</span><h3>{race.raceTitle}</h3></div>
                <a href={race.raceUrl}>Results on LiveRC</a>
              </div>
              {drivers.length ? (
                <RaceDayDesktopStandings
                  key={race.raceUrl}
                  rows={drivers}
                  buildStats={buildStats}
                  displayPosition={displayPosition}
                  makeRowKey={driverKey}
                  compact={width < DESKTOP_WEB_MIN_WIDTH}
                />
              ) : <RaceStatus result={standings} loading="Loading driver results…" empty="No driver results are available for this race." />}
            </section>
          )}
        </div>
      )}
    </>
  );
}

function LiveResultsWeb() {
  const [input, setInput] = useState(defaultTrack);
  const [origin, setOrigin] = useState(defaultTrack);
  const [revision, setRevision] = useState(0);
  const [inputError, setInputError] = useState('');

  function openTrack(e) {
    e.preventDefault();
    const next = trackOrigin(input.trim());
    if (!next) {
      setInputError('Enter a track address such as prwevents.liverc.com.');
      return;
    }
    setInputError('');
    setInput(next);
    if (next === origin) setRevision((value) => value + 1);
    setOrigin(next);
  }

  return (
    <div className="lr-scroll">
      <style>{viewerStyles}</style>
      <main className="lr-page">
        <header className="lr-heading">
          <Link href="/">‹ Back</Link>
          <div><span>IMRC SETUP MANAGER</span><h1>LiveRC Results</h1></div>
        </header>
        <form className="lr-card lr-form" onSubmit={openTrack}>
          <label htmlFor="liverc-track">LiveRC track URL</label>
          <div className="lr-form-row">
            <input id="liverc-track" type="text" value={input} onChange={(e) => { setInput(e.target.value); setInputError(''); }}
              autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(inputError)} aria-describedby={inputError ? 'liverc-input-error' : undefined} />
            <button type="submit">Open track</button>
            <button className="lr-secondary" type="button" onClick={() => setRevision((value) => value + 1)}>Refresh</button>
          </div>
          {inputError && <p id="liverc-input-error" className="lr-error" role="alert">{inputError}</p>}
        </form>
        <TrackResults key={origin} origin={origin} revision={revision} />
      </main>
    </div>
  );
}

export default function LiveResultsScreen() {
  return Platform.OS === 'web' ? <LiveResultsWeb /> : null;
}

const viewerStyles = `
.lr-scroll { flex: 1; overflow: auto; min-height: 0; color: ${AppColors.text}; font-family: system-ui, sans-serif; color-scheme: dark; }
.lr-page { max-width: 1480px; margin: auto; padding: 16px 28px 28px; box-sizing: border-box; }
.lr-heading { display: flex; align-items: center; gap: 14px; border-bottom: 1px solid ${AppColors.borderStrong}; padding-bottom: 14px; margin-bottom: 16px; }
.lr-heading span, .lr-round { color: #99c4ff; font-size: .75rem; font-weight: 800; letter-spacing: .07em; }
.lr-round { color: ${AppColors.raceNumber}; }
.lr-page :is(h1,h2,h3,p) { margin: 0; }
.lr-page h1 { font-size: 1.875rem; line-height: 1.2; }
.lr-page h2 { font-size: 1.375rem; }
.lr-page h3 { font-size: 1.125rem; margin-top: 3px; overflow-wrap: anywhere; }
.lr-page a { color: #a8cbfc; font-weight: 650; text-underline-offset: 3px; }
.lr-heading a, .lr-page button { border: 1px solid ${AppColors.borderStrong}; padding: 9px 12px; border-radius: 7px; font: inherit; font-weight: 750; }
.lr-heading a { text-decoration: none; white-space: nowrap; }
.lr-page button { cursor: pointer; background: #2366c5; color: white; }
.lr-page .lr-secondary { background: ${AppColors.backgroundSoft}; color: #a8cbfc; }
.lr-card { background: ${AppColors.surface}; border: 1px solid ${AppColors.border}; border-radius: 10px; padding: 14px; min-width: 0; }
.lr-page label { display: grid; gap: 5px; color: ${AppColors.mutedText}; font-weight: 700; font-size: .875rem; }
.lr-form-row { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 6px; }
.lr-page :is(input,select) { min-width: 0; box-sizing: border-box; color: ${AppColors.text}; background: ${AppColors.backgroundSoft}; border: 1px solid ${AppColors.borderStrong}; border-radius: 7px; padding: 9px 10px; font: inherit; min-height: 42px; }
.lr-page input { flex: 1 1 210px; }
.lr-page select { width: 100%; }
.lr-track, .lr-result-header { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; }
.lr-track { margin: 20px 0 12px; }
.lr-result-header { margin-bottom: 12px; }
.lr-links { display: flex; flex-wrap: wrap; gap: 7px 14px; }
.lr-workspace { display: grid; grid-template-columns: minmax(220px, 285px) minmax(0, 1fr); align-items: start; gap: 14px; }
.lr-pickers { display: grid; gap: 12px; }
.lr-page .lr-muted { color: ${AppColors.mutedText}; }
.lr-page .lr-error { color: #ffaaaa; margin-top: 6px; }
.lr-page :focus-visible { outline: 2px solid #a8cbfc; outline-offset: 2px; }
@media (max-width: 899px) { .lr-page { padding: 13px; } .lr-workspace { grid-template-columns: minmax(0,1fr); } }
`;
