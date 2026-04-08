export type PlayerHistoryKeyboardAction =
  | 'previous-point'
  | 'next-point'
  | 'jump-to-peak'
  | 'jump-to-latest'
  | 'clear-lock'
  | 'toggle-lock';

export function resolvePlayerHistoryKeyboardAction(
  key: string,
): PlayerHistoryKeyboardAction | null {
  switch (key) {
    case 'ArrowLeft':
      return 'previous-point';
    case 'ArrowRight':
      return 'next-point';
    case 'Home':
      return 'jump-to-peak';
    case 'End':
      return 'jump-to-latest';
    case 'Escape':
      return 'clear-lock';
    case 'Enter':
    case ' ':
      return 'toggle-lock';
    default:
      return null;
  }
}
