export interface FeedbackMessage {
  message: string;
  kind: 'info' | 'success' | 'error' | 'loading';
}
