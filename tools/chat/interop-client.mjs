import assert from 'node:assert/strict';

// Exercise the production transport/session; only the network destination and HTTP grant are local.
const NativeWebSocket = globalThis.WebSocket;
globalThis.WebSocket = class extends NativeWebSocket {
  constructor() {
    super(process.env.MIK_CHAT_INTEROP_URL, {
      headers: { origin: 'https://mcmik.top', 'x-forwarded-proto': 'https' },
    });
  }
};
if (process.env.MIK_CHAT_NO_DEFLATE === 'true') {
  globalThis.DecompressionStream = class {
    constructor() {
      throw new Error('Unsupported compression');
    }
  };
}
const { ChatSession } = await import('../../src/modules/chat/lib/connection/chat-session.ts');
const OWNER = '11111111-1111-4111-8111-111111111111';
let ready;
let reject;
const online = new Promise((resolve, fail) => {
  ready = resolve;
  reject = fail;
});
const events = [];
const session = new ChatSession(
  OWNER,
  {
    onConnection: (state) => {
      if (state.status === 'online') ready();
      else if (state.status === 'error') reject(new Error(JSON.stringify(state)));
    },
    onEvent: (event) => events.push(event),
    onDisconnect: () => reject(new Error('Integration connection closed')),
    onRefreshAccount: () => {},
    onDeliveryTimeout: () => {},
  },
  {
    createTransport: () => {
      // Import is resolved before the connection is created.
      return new Transport();
    },
    authorize: async (connectionId, clientPublicKey) => {
      console.log(`AUTHORIZE ${JSON.stringify({ connectionId, clientPublicKey })}`);
      return { ok: true };
    },
    now: () => Date.now(),
    schedule: (callback, delay) => {
      const id = setTimeout(callback, delay);
      return () => clearTimeout(id);
    },
  },
);
const { ChatTransport: Transport } = await import(
  '../../src/modules/chat/lib/connection/chat-transport.ts'
);
try {
  session.retry();
  await online;
  let page;
  const messages = new Map();
  let requests = 0;
  do {
    page = await session.readHistory({
      channel: 'public',
      ...(page?.nextPage ? { page: page.nextPage } : {}),
    });
    requests++;
    for (const message of page.messages) messages.set(message.id, message);
  } while (page.nextPage);
  assert.ok(requests >= 2);
  assert.equal([...messages.values()].filter((message) => message.kind === 'server').length, 270);
  assert.ok(
    [...messages.values()].every(
      (message) =>
        message.kind !== 'server' ||
        (message.order && message.content[0].text.includes('跨端历史')),
    ),
  );
  const delta = await session.readHistory({ channel: 'public', since: page.checkpoint });
  assert.equal(delta.messages.length, 0);
  const sent = session.send({ channel: 'public' }, '跨端发送 🌍');
  assert.equal(sent.ok, true);
  const deadline = Date.now() + 5000;
  while (
    !events.some((event) => event.type === 'accepted' && event.requestId === sent.requestId) &&
    Date.now() < deadline
  )
    await new Promise((resolve) => setTimeout(resolve, 5));
  const echo = events.find(
    (event) => event.type === 'message' && event.message.requestId === sent.requestId,
  );
  const accepted = events.find(
    (event) => event.type === 'accepted' && event.requestId === sent.requestId,
  );
  assert.ok(echo && accepted, 'Encrypted echo and acknowledgement must survive key rotation');
  assert.equal(echo.message.id, accepted.messageId);
  assert.equal(echo.message.content.map((part) => part.text).join(''), '跨端发送 🌍');
  assert.ok(session.hasHistory);
  console.log('PASSED');
} finally {
  session.stop();
}
