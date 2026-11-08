import type { ChatSender } from '@/modules/chat/model/chat-protocol';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

/** External authors use an inert placeholder until an authenticated player binding exists. */
export function ChatAuthorAvatar({ sender, size }: { sender: ChatSender; size: number }) {
  return sender.playerUuid ? (
    <MinecraftAvatar uuid={sender.playerUuid} name={sender.playerName ?? sender.name} size={size} />
  ) : (
    <span
      className="chat-author-placeholder"
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      {Array.from(sender.name.trim())[0]?.toUpperCase() ?? '?'}
    </span>
  );
}
