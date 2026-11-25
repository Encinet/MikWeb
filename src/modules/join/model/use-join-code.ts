'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { JoinCodeRequestError, requestJoinCode } from '@/modules/join/lib/request-join-code';
import type { JoinCode, JoinCodeError } from '@/modules/join/model/join-code';
import type { JoinGroupId } from '@/modules/join/model/join-group';

type CodeState =
  | { phase: 'idle' | 'verifying' | 'loading' | 'expired' }
  | { phase: 'ready'; value: JoinCode; deadline: number; wallDeadline: number; copied: boolean }
  | { phase: 'error'; error: JoinCodeError };

function remainingTime(deadline: number, wallDeadline: number): number {
  return Math.max(0, Math.min(deadline - performance.now(), wallDeadline - Date.now()));
}

export function useJoinCode(group: JoinGroupId, captchaAvailable: boolean) {
  const [state, setState] = useState<CodeState>({ phase: 'idle' });
  const [remaining, setRemaining] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const deadline = state.phase === 'ready' ? state.deadline : null;
  const wallDeadline = state.phase === 'ready' ? state.wallDeadline : null;

  const cancelVerification = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setState({ phase: 'idle' });
  }, []);

  useLayoutEffect(() => cancelVerification, [cancelVerification]);

  useEffect(() => {
    if (deadline === null || wallDeadline === null) return;
    const update = () => {
      const milliseconds = remainingTime(deadline, wallDeadline);
      setRemaining(milliseconds);
      if (!milliseconds) setState({ phase: 'expired' });
    };
    update();
    const timer = window.setInterval(update, 250);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pageshow', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('pageshow', update);
    };
  }, [deadline, wallDeadline]);

  const request = () => {
    if (controller.current || state.phase === 'verifying') return;
    setState(
      captchaAvailable ? { phase: 'verifying' } : { phase: 'error', error: 'captcha_unavailable' },
    );
  };

  const failVerification = () => {
    if (state.phase === 'verifying') setState({ phase: 'error', error: 'captcha_unavailable' });
  };

  const verify = async (token: string) => {
    if (controller.current || state.phase !== 'verifying') return;
    const abort = new AbortController();
    controller.current = abort;
    setState({ phase: 'loading' });
    try {
      const code = await requestJoinCode(group, token, { signal: abort.signal });
      if (abort.signal.aborted) return;
      setRemaining(remainingTime(code.deadline, code.wallDeadline));
      setState({ phase: 'ready', ...code, copied: false });
    } catch (error) {
      if (abort.signal.aborted) return;
      const code = error instanceof JoinCodeRequestError ? error.code : 'request_failed';
      setState({ phase: 'error', error: code });
    } finally {
      if (controller.current === abort) controller.current = null;
    }
  };

  const markCopied = (code: string) => {
    setState((current) =>
      current.phase === 'ready' && current.value.code === code
        ? { ...current, copied: true }
        : current,
    );
  };

  return {
    state,
    remaining,
    request,
    verify,
    cancelVerification,
    failVerification,
    markCopied,
  };
}
