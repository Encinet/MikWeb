import type { EchoQuote } from './echo-quote-types';
import rawQuotes from './echo-quotes.json';

export const echoQuotes: EchoQuote[] = (rawQuotes as string[]).map((text) => ({ text }));
