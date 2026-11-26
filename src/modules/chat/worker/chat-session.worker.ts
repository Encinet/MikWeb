import { browserChatEnvironment, ChatSession } from '../lib/connection/chat-session';
import { SharedChatHost } from '../lib/connection/shared-chat-host';

const host = new SharedChatHost((owner, scope, observer) =>
  new ChatSession(owner, observer, browserChatEnvironment(scope)));
self.addEventListener('connect', event => host.listen((event as MessageEvent).ports[0]));
