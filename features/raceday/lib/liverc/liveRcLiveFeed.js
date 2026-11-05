// Keep the explicit default port: this exactly matches LiveRC's own 0.9.16
// client and is significant to its legacy session routing.
const LIVE_DATA_ORIGIN = 'https://livedata.liveracemedia.com:443';
const SOCKET_RESOURCE = 'socket.io';
const SOCKET_PROTOCOL = '1';
const CONNECT_TIMEOUT_MS = 12000;
const FETCH_TIMEOUT_MS = 12000;
const POLL_TIMEOUT_MS = 70000;
const STALE_CLEAR_MS = 20000;
const MAX_RECONNECT_DELAY_MS = 15000;
const TOP_DRIVER_LIMIT = 5;

export const EMPTY_LIVE_RC_STATE = Object.freeze({
  configured: false,
  connection: 'idle',
  active: false,
  mode: 'idle',
  className: '',
  raceNumber: '',
  totalRaces: '',
  roundNumber: '',
  roundType: '',
  heat: '',
  raceStatus: '',
  eventName: '',
  drivers: [],
  updatedAt: null,
  debug: {},
});

function clean(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function getOrigin(input = '') {
  const trimmed = clean(input);
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    const host = withProtocol.replace(/^https?:\/\//i, '').split('/')[0];
    return host ? `https://${host}` : '';
  }
}

export function getLiveRcScoringUrl(siteUrl = '') {
  const origin = getOrigin(siteUrl);
  return origin ? `${origin}/live/scoring/` : '';
}

export function getLiveRcLiveUrl(siteUrl = '') {
  const origin = getOrigin(siteUrl);
  return origin ? `${origin}/live/` : '';
}

export function findLiveRcScoringUrl(liveHtml = '', liveUrl = '') {
  const source = String(liveHtml || '');
  const iframeSource = source.match(/<iframe[^>]+(?:id=["']scoring_iframe["'][^>]+src|src)=["']([^"']*\/live\/scoring\/[^"']*)["']/i)?.[1];
  if (iframeSource) {
    try {
      return new URL(iframeSource, liveUrl).toString();
    } catch {
      // Fall through to LiveRC's standard scoring path.
    }
  }
  return getLiveRcScoringUrl(liveUrl);
}

export function parseLiveRcScoringBootstrap(html = '') {
  const source = String(html || '');
  const accountId =
    source.match(/["']account_id["']\s*:\s*["'](\d+)["']/i)?.[1] ||
    source.match(/\baccount_id\s*=\s*["']?(\d+)/i)?.[1] ||
    '';
  const eventId =
    source.match(/(?:window\.)?eventID\s*=\s*["']?([\w-]+)/i)?.[1] ||
    '';

  return {
    accountId: clean(accountId),
    eventId: clean(eventId),
    room: accountId ? `t${accountId}${eventId ? `-${eventId}` : ''}` : '',
  };
}

export function parseLiveRcRaceData(payload = '') {
  const parts = String(payload || '').split('|');
  const rawClass = clean(parts[0]);
  const heatMatch = rawClass.match(/\(([^()]*(?:main|heat)[^()]*)\)\s*$/i);
  const parsedHeat = clean(heatMatch?.[1] || '');
  const className = clean(heatMatch ? rawClass.slice(0, heatMatch.index) : rawClass);
  const roundNumber = clean(parts[6]);
  const isPractice = roundNumber.toUpperCase() === 'OP';
  const heatNumber = clean(parts[17]);
  const totalHeats = clean(parts[18]);
  const heat = isPractice
    ? 'Open Practice'
    : roundNumber.toUpperCase() === 'M'
      ? parsedHeat
      : heatNumber && totalHeats
        ? `Heat ${heatNumber}/${totalHeats}`
        : parsedHeat;
  const dataReceived = parts.length > 5 && Boolean(rawClass || roundNumber || parts[4]);

  return {
    active: dataReceived,
    mode: dataReceived ? (isPractice ? 'practice' : 'race') : 'idle',
    className: isPractice ? 'Open Practice' : className,
    raceStatus: clean(parts[2]),
    raceNumber: clean(parts[4]),
    totalRaces: clean(parts[5]),
    roundNumber,
    roundType: clean(parts[9]),
    heat,
    eventName: clean(parts[12]),
    numDrivers: Number.parseInt(parts[21], 10) || 0,
  };
}

function parseDriverRow(key, value) {
  const parts = String(value || '').split('|');
  const realName = clean(parts[1]);
  const nickName = clean(parts[36]);
  const name = nickName || realName;
  if (!name && !clean(parts[2])) return null;

  return {
    key,
    position: clean(parts[0]),
    name,
    realName,
    nickName,
    carNumber: clean(parts[2]),
    laps: clean(parts[3]),
    checkedIn: Number.parseInt(parts[10], 10) || 0,
    driverId: clean(parts[11]),
    offTrack: Number.parseInt(parts[18], 10) || 0,
    driverClass: clean(parts[40]),
  };
}

export function parseLiveRcDriverData(payload = '') {
  let parsed = payload;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!parsed || typeof parsed !== 'object') return [];

  return Object.entries(parsed)
    .filter(([key]) => /^p\d+$/i.test(key))
    .map(([key, value]) => parseDriverRow(key, value))
    .filter(Boolean)
    .sort((a, b) => {
      const aPosition = Number.parseInt(a.position, 10);
      const bPosition = Number.parseInt(b.position, 10);
      if (Number.isFinite(aPosition) && Number.isFinite(bPosition)) return aPosition - bPosition;
      return a.key.localeCompare(b.key, undefined, { numeric: true });
    });
}

export function splitLegacySocketPayload(payload = '') {
  const source = String(payload ?? '');
  if (!source.startsWith('\ufffd')) return source ? [source] : [];

  const packets = [];
  let cursor = 0;
  while (cursor < source.length && source[cursor] === '\ufffd') {
    const lengthEnd = source.indexOf('\ufffd', cursor + 1);
    if (lengthEnd < 0) break;
    const length = Number.parseInt(source.slice(cursor + 1, lengthEnd), 10);
    if (!Number.isFinite(length) || length < 0) break;
    const start = lengthEnd + 1;
    packets.push(source.slice(start, start + length));
    cursor = start + length;
  }
  return packets;
}

export function parseLegacySocketEvent(packet = '') {
  const match = String(packet || '').match(/^5(?::[^:]*)?::?(.*)$/s);
  if (!match?.[1]) return null;
  try {
    const event = JSON.parse(match[1]);
    return event?.name ? event : null;
  } catch {
    return null;
  }
}

async function fetchText(fetchImpl, url, timeoutMs = FETCH_TIMEOUT_MS, options = {}) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetchImpl(url, {
      method: options.method || 'GET',
      headers: { Accept: 'text/plain,text/html,*/*', ...(options.headers || {}) },
      body: options.body,
      // LiveRC's official cross-domain Socket.IO 0.9 client sets
      // XMLHttpRequest.withCredentials = true. Without the equivalent here,
      // its polling request can lose the handshake session and return
      // 7:::1+0 (client not handshaken).
      credentials: 'include',
      signal: controller?.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`LiveRC request failed: ${response.status}`);
    return text;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function xhrText(XHRImpl, url, timeoutMs = FETCH_TIMEOUT_MS, options = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XHRImpl();
    xhr.open(options.method || 'GET', url, true);
    xhr.timeout = timeoutMs;
    xhr.withCredentials = true;
    const headers = { Accept: 'text/plain,text/html,*/*', ...(options.headers || {}) };
    Object.entries(headers).forEach(([name, value]) => {
      try {
        xhr.setRequestHeader?.(name, value);
      } catch {
        // Some browser implementations protect Origin/Referer. React Native's
        // native XHR accepts them; protected browsers already supply them.
      }
    });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(String(xhr.responseText || ''));
      else reject(new Error(`LiveRC request failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('LiveRC native XHR network error'));
    xhr.ontimeout = () => reject(new Error('LiveRC native XHR timed out'));
    xhr.onabort = () => reject(new Error('LiveRC native XHR aborted'));
    xhr.send(options.body ?? null);
  });
}

function socketEventPacket(name, args = []) {
  return `5:::${JSON.stringify({ name, args })}`;
}

function legacySocketError(packet = '') {
  const code = String(packet || '').split(':::')[1] || '';
  if (code.startsWith('1')) return 'LiveRC rejected the session: client not handshaken';
  if (code.startsWith('2')) return 'LiveRC rejected the session: unauthorized';
  if (code.startsWith('0')) return 'LiveRC transport is not supported';
  return 'LiveRC closed the connection';
}

export class LiveRcLiveFeed {
  constructor({ siteUrl = '', onState, fetchImpl, WebSocketImpl, XHRImpl } = {}) {
    this.siteUrl = siteUrl;
    this.onState = typeof onState === 'function' ? onState : () => {};
    this.fetchImpl = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    this.WebSocketImpl = WebSocketImpl || (typeof WebSocket !== 'undefined' ? WebSocket : null);
    this.XHRImpl = XHRImpl || (typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest : null);
    this.socket = null;
    this.transportToken = null;
    this.pollUrl = '';
    this.preferPolling = false;
    this.room = '';
    this.race = null;
    this.drivers = new Map();
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.connectTimer = null;
    this.staleTimer = null;
    this.liveEmitTimer = null;
    this.pendingLivePatch = null;
    this.generation = 0;
    this.stopped = true;
    this.state = {
      ...EMPTY_LIVE_RC_STATE,
      configured: Boolean(getLiveRcScoringUrl(siteUrl)),
      debug: {
        liveUrl: getLiveRcLiveUrl(siteUrl),
        scoringUrl: '',
        step: 'Ready',
        trackId: '',
        room: '',
        transport: '',
        transports: '',
        attempts: 0,
        lastPacket: '',
        lastEvent: '',
        lastError: '',
      },
    };
  }

  start() {
    if (!this.state.configured || !this.fetchImpl) return;
    this.stop({ preserveState: true });
    this.stopped = false;
    const generation = ++this.generation;
    this._setState({ connection: 'connecting' });
    this._setDebug({ step: 'Opening /live/', lastError: '' });
    this._connect(generation);
  }

  stop({ preserveState = false } = {}) {
    this.stopped = true;
    this.generation += 1;
    this._clearTimers();
    this._closeSocket();
    if (!preserveState) {
      this.race = null;
      this.drivers.clear();
      this.state = {
        ...EMPTY_LIVE_RC_STATE,
        configured: Boolean(getLiveRcScoringUrl(this.siteUrl)),
        debug: { ...this.state.debug, step: 'Stopped' },
      };
      this.onState(this.state);
    }
  }

  async _connect(generation) {
    try {
      const liveUrl = getLiveRcLiveUrl(this.siteUrl);
      this._setDebug({ liveUrl, step: 'Loading LiveRC /live/' });
      const liveHtml = await fetchText(this.fetchImpl, liveUrl);
      if (this.stopped || generation !== this.generation) return;

      const scoringUrl = findLiveRcScoringUrl(liveHtml, liveUrl);
      this._setDebug({ scoringUrl, step: 'Loading scoring iframe' });
      const scoringHtml = await fetchText(this.fetchImpl, scoringUrl);
      if (this.stopped || generation !== this.generation) return;

      const bootstrap = parseLiveRcScoringBootstrap(scoringHtml);
      if (!bootstrap.room) throw new Error('LiveRC track ID was not found.');
      this.room = bootstrap.room;
      this._setDebug({
        trackId: bootstrap.accountId,
        room: bootstrap.room,
        step: 'Track found; requesting handshake',
      });

      const now = Date.now();
      const handshakeUrl = `${LIVE_DATA_ORIGIN}/${SOCKET_RESOURCE}/${SOCKET_PROTOCOL}/?userType=scoring&t=${now}`;
      const handshake = clean(await this._socketRequest(handshakeUrl));
      if (this.stopped || generation !== this.generation) return;

      const [sessionId, , , transports = ''] = handshake.split(':');
      if (!sessionId) throw new Error('LiveRC live connection was unavailable.');
      this._setDebug({ transports, step: 'Handshake received' });

      if ((this.preferPolling || !this.WebSocketImpl) && transports.includes('xhr-polling')) {
        this._setDebug({ transport: this.XHRImpl ? 'xhr-polling (native XHR)' : 'xhr-polling (fetch)', step: 'Starting continuous polling' });
        this._startPolling(sessionId, generation);
        return;
      }
      if (!transports.includes('websocket')) {
        if (transports.includes('xhr-polling')) {
          this.preferPolling = true;
          this._setDebug({ transport: this.XHRImpl ? 'xhr-polling (native XHR)' : 'xhr-polling (fetch)', step: 'WebSocket unavailable; using polling' });
          this._startPolling(sessionId, generation);
          return;
        }
        throw new Error('LiveRC live connection was unavailable.');
      }

      const socketUrl = `wss://livedata.liveracemedia.com:443/${SOCKET_RESOURCE}/${SOCKET_PROTOCOL}/websocket/${encodeURIComponent(sessionId)}?userType=scoring`;
      let socket;
      try {
        // React Native accepts request headers in this third option. Providing
        // the LiveRC track origin mirrors the working browser connection.
        socket = new this.WebSocketImpl(socketUrl, null, {
          headers: { Origin: getOrigin(this.siteUrl) },
        });
      } catch {
        socket = new this.WebSocketImpl(socketUrl);
      }
      this.socket = socket;
      this.transportToken = socket;
      this._setDebug({ transport: 'websocket', step: 'Opening WebSocket' });

      this.connectTimer = setTimeout(() => {
        if (this.socket === socket && this.state.connection !== 'connected') {
          this._handleDisconnect(generation, new Error('LiveRC connection timed out.'));
        }
      }, CONNECT_TIMEOUT_MS);

      socket.onmessage = (event) => this._handleMessage(event?.data, generation, socket);
      socket.onopen = () => this._setDebug({ step: 'WebSocket open; waiting for LiveRC connect packet' });
      socket.onerror = () => {
        this._setDebug({ lastError: 'WebSocket error', step: 'WebSocket failed' });
        this._setState({ connection: 'reconnecting' });
      };
      socket.onclose = () => {
        // LiveRC uses Socket.IO 0.9. Some React Native networking stacks can
        // complete its handshake but cannot keep the WebSocket upgrade alive.
        // Switch subsequent attempts to the server's supported long-polling
        // transport instead of repeating the same failed upgrade forever.
        this.preferPolling = true;
        this._handleDisconnect(generation, new Error('WebSocket closed'));
      };
    } catch (error) {
      if (!this.stopped && generation === this.generation) this._handleDisconnect(generation, error);
    }
  }

  _handleMessage(payload, generation, transportToken) {
    if (this.stopped || generation !== this.generation || transportToken !== this.transportToken) return;

    for (const packet of splitLegacySocketPayload(payload)) {
      this._setDebug({ lastPacket: clean(packet).slice(0, 80) });
      if (packet.startsWith('1::')) {
        if (this.connectTimer) clearTimeout(this.connectTimer);
        this.connectTimer = null;
        this.reconnectAttempts = 0;
        this._setState({ connection: 'connected' });
        this._setDebug({ step: `Connected; joining ${this.room}`, lastError: '' });
        this._send(socketEventPacket('joinTrack', [this.room]));
        continue;
      }
      if (packet.startsWith('2::')) {
        this._send('2::');
        continue;
      }
      if (packet.startsWith('0::') || packet.startsWith('7::')) {
        if (this.state.debug?.transport === 'websocket' && this.state.debug?.transports?.includes('xhr-polling')) {
          // LiveRC sometimes accepts React Native's WebSocket upgrade and then
          // immediately answers with its legacy disconnect packet (0::). Move
          // the next handshake to polling before _closeSocket removes onclose.
          this.preferPolling = true;
        } else if (packet.startsWith('7::') && this.state.debug?.transport?.startsWith('xhr-polling')) {
          this.preferPolling = false;
        }
        this._handleDisconnect(generation, new Error(legacySocketError(packet)));
        return;
      }

      const event = parseLegacySocketEvent(packet);
      if (!event) continue;
      this._setDebug({ lastEvent: event.name, step: `Receiving ${event.name}` });
      this._handleLiveEvent(event.name, event.args || []);
    }
  }

  _handleLiveEvent(name, args) {
    if (name === 'joinedRoom') {
      this._setDebug({ step: `Joined LiveRC room ${clean(args[0]) || this.room}`, lastError: '' });
      return;
    }
    if (name === 'updateRaceData') {
      const nextRace = parseLiveRcRaceData(args[0]);
      const previousRaceKey = this.race
        ? `${this.race.roundNumber}-${this.race.raceNumber}-${this.race.mode}`
        : '';
      const nextRaceKey = `${nextRace.roundNumber}-${nextRace.raceNumber}-${nextRace.mode}`;
      if (previousRaceKey && previousRaceKey !== nextRaceKey) this.drivers.clear();
      this.race = nextRace;
      if (!nextRace.active) this.drivers.clear();
      this._emitLiveState();
      return;
    }

    if (name === 'updateDriverData') {
      const rows = parseLiveRcDriverData(args[0]);
      for (const row of rows) this.drivers.set(row.key, row);
      this._emitLiveState();
    }
  }

  _emitLiveState() {
    const race = this.race;
    const active = Boolean(race?.active);
    const sortedDrivers = active
      ? Array.from(this.drivers.values()).sort((a, b) => {
          const aPosition = Number.parseInt(a.position, 10);
          const bPosition = Number.parseInt(b.position, 10);
          if (Number.isFinite(aPosition) && Number.isFinite(bPosition)) return aPosition - bPosition;
          return a.key.localeCompare(b.key, undefined, { numeric: true });
        })
      : [];
    // LiveRC's numDrivers field can temporarily report only the cars currently
    // counted on track even though its ranked driver payload already contains
    // more positions. Always take up to five actual ranked records instead.
    const drivers = sortedDrivers.slice(0, TOP_DRIVER_LIMIT);

    this.pendingLivePatch = {
      active,
      mode: race?.mode || 'idle',
      className: race?.className || '',
      raceNumber: race?.raceNumber || '',
      totalRaces: race?.totalRaces || '',
      roundNumber: race?.roundNumber || '',
      roundType: race?.roundType || '',
      heat: race?.heat || '',
      raceStatus: race?.raceStatus || '',
      eventName: race?.eventName || '',
      drivers,
      updatedAt: new Date().toISOString(),
    };

    // Race and driver packets commonly arrive back-to-back. Coalesce them into
    // one React update so the complete Race Day dashboard does not render twice.
    if (this.liveEmitTimer) return;
    this.liveEmitTimer = setTimeout(() => {
      this.liveEmitTimer = null;
      const patch = this.pendingLivePatch;
      this.pendingLivePatch = null;
      if (patch && !this.stopped) this._setState(patch);
    }, 16);
  }

  _send(payload) {
    if (this.pollUrl && this.transportToken) {
      this._socketRequest(`${this.pollUrl}?userType=scoring&t=${Date.now()}`, FETCH_TIMEOUT_MS, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: payload,
      }).catch(() => this._handleDisconnect(this.generation));
      return;
    }
    try {
      if (this.socket?.readyState === 1) this.socket.send(payload);
    } catch {
      // The close handler owns reconnection.
    }
  }

  _handleDisconnect(generation, error) {
    if (this.stopped || generation !== this.generation) return;
    this._closeSocket();
    this._setDebug({
      step: 'Connection lost; retry scheduled',
      lastError: error?.message || this.state.debug?.lastError || 'Connection closed',
      attempts: this.reconnectAttempts + 1,
    });
    this._setState({ connection: 'reconnecting' });

    if (!this.staleTimer && this.state.active) {
      this.staleTimer = setTimeout(() => {
        this.staleTimer = null;
        if (this.state.connection !== 'connected') {
          this.race = null;
          this.drivers.clear();
          this._setState({
            active: false,
            mode: 'idle',
            className: '',
            raceNumber: '',
            totalRaces: '',
            roundNumber: '',
            roundType: '',
            heat: '',
            raceStatus: '',
            eventName: '',
            drivers: [],
          });
        }
      }, STALE_CLEAR_MS);
    }

    if (this.reconnectTimer) return;
    const delay = Math.min(2000 * 2 ** this.reconnectAttempts, MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.stopped) return;
      const nextGeneration = ++this.generation;
      this._connect(nextGeneration);
    }, delay);
  }

  _setState(patch) {
    if (patch.connection === 'connected' && this.staleTimer) {
      clearTimeout(this.staleTimer);
      this.staleTimer = null;
    }
    this.state = { ...this.state, ...patch };
    this.onState(this.state);
  }

  _setDebug(patch) {
    // Debug transport details are internal and are not displayed. Keep them out
    // of React's update path, especially because this runs for every packet.
    this.state = {
      ...this.state,
      debug: {
        ...(this.state.debug || {}),
        ...patch,
        debugUpdatedAt: new Date().toISOString(),
      },
    };
  }

  _socketRequest(url, timeoutMs = FETCH_TIMEOUT_MS, options = {}) {
    const trackOrigin = getOrigin(this.siteUrl);
    const requestOptions = {
      ...options,
      headers: {
        Origin: trackOrigin,
        Referer: `${trackOrigin}/live/scoring/`,
        ...(options.headers || {}),
      },
    };
    if (this.XHRImpl) return xhrText(this.XHRImpl, url, timeoutMs, requestOptions);
    return fetchText(this.fetchImpl, url, timeoutMs, requestOptions);
  }

  _closeSocket() {
    const socket = this.socket;
    this.socket = null;
    this.transportToken = null;
    this.pollUrl = '';
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    try {
      socket.close();
    } catch {
      // Already closed.
    }
  }

  _startPolling(sessionId, generation) {
    const token = {};
    this.transportToken = token;
    this.pollUrl = `${LIVE_DATA_ORIGIN}/${SOCKET_RESOURCE}/${SOCKET_PROTOCOL}/xhr-polling/${encodeURIComponent(sessionId)}`;
    this._setDebug({
      transport: this.XHRImpl ? 'xhr-polling (native XHR)' : 'xhr-polling (fetch)',
      step: 'Polling connection open',
    });

    this.connectTimer = setTimeout(() => {
      if (this.transportToken === token && this.state.connection !== 'connected') {
        this._handleDisconnect(generation, new Error('LiveRC polling connection timed out.'));
      }
    }, CONNECT_TIMEOUT_MS);

    const poll = async () => {
      while (!this.stopped && generation === this.generation && this.transportToken === token) {
        try {
          const payload = await this._socketRequest(
            `${this.pollUrl}?userType=scoring&t=${Date.now()}`,
            POLL_TIMEOUT_MS,
          );
          if (this.stopped || generation !== this.generation || this.transportToken !== token) return;
          this._handleMessage(payload, generation, token);
        } catch (error) {
          if (!this.stopped && generation === this.generation && this.transportToken === token) {
            this._handleDisconnect(generation, error);
          }
          return;
        }
      }
    };

    poll();
  }

  _clearTimers() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.connectTimer) clearTimeout(this.connectTimer);
    if (this.staleTimer) clearTimeout(this.staleTimer);
    if (this.liveEmitTimer) clearTimeout(this.liveEmitTimer);
    this.reconnectTimer = null;
    this.connectTimer = null;
    this.staleTimer = null;
    this.liveEmitTimer = null;
    this.pendingLivePatch = null;
  }
}
