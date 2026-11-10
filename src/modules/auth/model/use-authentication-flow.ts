'use client';

import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { startAuthentication, WebAuthnAbortService } from '@simplewebauthn/browser';
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { AuthRequestError, authRequest } from '@/modules/auth/lib/auth-request';
import { webAuthnError } from '@/modules/auth/lib/webauthn-error';
import { isAuthMeResponse } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import { withRequestTimeout } from '@/shared/lib/request-timeout';

export interface GameAuthenticationChallenge {
  challengeId: string;
  displayCode: string;
  expiresAt: string;
}

type Phase = 'idle' | 'creating' | 'passkey' | 'completing' | 'done';
type AuthenticationOptions = { onAuthenticated: () => void } & (
  | { purpose: 'login'; expectedPlayerUuid?: never }
  | { purpose: 'reauthenticate'; expectedPlayerUuid: string }
);

export function useAuthenticationFlow({
  purpose,
  expectedPlayerUuid,
  onAuthenticated,
}: AuthenticationOptions) {
  const { acceptAuthentication } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [challenge, setChallenge] = useState<GameAuthenticationChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const activeChallenge = useRef<GameAuthenticationChallenge | null>(null);
  const operation = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const completing = useRef(false);
  const ceremony = useRef(false);
  const authenticated = useEffectEvent(onAuthenticated);

  useEffect(() => {
    if (phase === 'done') authenticated();
  }, [phase]);

  useLayoutEffect(
    () => () => {
      operation.current++;
      abort.current?.abort();
      if (ceremony.current) WebAuthnAbortService.cancelCeremony();
      ceremony.current = false;
      completing.current = false;
      activeChallenge.current = null;
      setChallenge(null);
      setPhase('idle');
      setError(null);
      setRemainingSeconds(0);
    },
    [],
  );

  const updateChallenge = useCallback((next: GameAuthenticationChallenge | null) => {
    activeChallenge.current = next;
    setChallenge(next);
  }, []);

  const cancel = useCallback(() => {
    if (completing.current) return false;
    operation.current++;
    abort.current?.abort();
    if (ceremony.current) WebAuthnAbortService.cancelCeremony();
    ceremony.current = false;
    updateChallenge(null);
    setPhase('idle');
    setError(null);
    return true;
  }, [updateChallenge]);

  const finish = useCallback(
    (payload: unknown) => {
      if (!isAuthMeResponse(payload) || !payload.authenticated)
        throw new AuthRequestError('invalid_response', 502);
      if (expectedPlayerUuid && payload.account.playerUuid !== expectedPlayerUuid)
        throw new AuthRequestError('account_mismatch', 403);
      acceptAuthentication(payload.account);
      updateChallenge(null);
      setPhase('done');
    },
    [acceptAuthentication, expectedPlayerUuid, updateChallenge],
  );

  const expire = useCallback(
    (id: string) => {
      if (completing.current || activeChallenge.current?.challengeId !== id) return;
      updateChallenge(null);
      setPhase('idle');
      setError('expired');
    },
    [updateChallenge],
  );

  const completeGame = useCallback(
    async (current: GameAuthenticationChallenge) => {
      if (completing.current) return false;
      const generation = operation.current;
      completing.current = true;
      setPhase('completing');
      setError(null);
      try {
        const payload = await authRequest<unknown>(
          `/api/auth/challenges/${encodeURIComponent(current.challengeId)}/complete`,
          { signal: abort.current?.signal },
        );
        if (generation !== operation.current) return true;
        finish(payload);
        return true;
      } catch (cause) {
        if (generation !== operation.current) return true;
        const terminal =
          cause instanceof AuthRequestError &&
          cause.status >= 400 &&
          cause.status < 500 &&
          cause.status !== 429;
        if (terminal) updateChallenge(null);
        setError(cause instanceof AuthRequestError ? cause.code : 'request_failed');
        setPhase('idle');
        return terminal;
      } finally {
        if (generation === operation.current) completing.current = false;
      }
    },
    [finish, updateChallenge],
  );

  useEffect(() => {
    if (!challenge) return;
    let cancelled = false;
    let inFlight = false;
    let attempts = 0;
    let timer: number | undefined;
    const controller = new AbortController();
    const poll = async () => {
      if (cancelled || inFlight || document.hidden) return;
      inFlight = true;
      let finished = false;
      let delay = Math.min(10_000, 5000 + attempts * 2500);
      try {
        const { response, payload } = await withRequestTimeout(
          10_000,
          async (signal) => {
            const response = await fetch(
              `/api/auth/challenges/${encodeURIComponent(challenge.challengeId)}`,
              { cache: 'no-store', signal },
            );
            const payload = (await response.json().catch(() => null)) as {
              status?: string;
              error?: string;
            } | null;
            return { response, payload };
          },
          controller.signal,
        );
        if (cancelled) return;
        if (!response.ok) {
          delay = Math.max(
            delay,
            Math.min(60_000, Number(response.headers.get('retry-after')) * 1000 || 10_000),
          );
          if ([401, 403, 404].includes(response.status)) {
            finished = true;
            updateChallenge(null);
            setError(response.status === 401 ? 'unauthenticated' : 'expired');
          } else setError(response.status === 429 ? 'rate_limited' : 'status_unavailable');
        } else if (payload?.status === 'confirmed') finished = await completeGame(challenge);
        else if (['expired', 'not_found', 'consumed'].includes(payload?.status ?? '')) {
          finished = true;
          expire(challenge.challengeId);
        } else setError(payload?.status === 'pending' ? null : 'status_unavailable');
      } catch {
        delay = 10_000;
        if (!cancelled) setError('status_unavailable');
      } finally {
        inFlight = false;
        attempts++;
        if (!cancelled && !finished && !document.hidden) timer = window.setTimeout(poll, delay);
      }
    };
    const resume = () => {
      if (!document.hidden) {
        window.clearTimeout(timer);
        void poll();
      }
    };
    timer = window.setTimeout(poll, 2500);
    document.addEventListener('visibilitychange', resume);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [challenge, completeGame, expire, updateChallenge]);

  useEffect(() => {
    if (!challenge || phase === 'completing') return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((Date.parse(challenge.expiresAt) - Date.now()) / 1000),
      );
      setRemainingSeconds(remaining);
      if (remaining === 0) expire(challenge.challengeId);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [challenge, phase, expire]);

  const startGame = async () => {
    if (phase !== 'idle') return;
    const generation = ++operation.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setPhase('creating');
    setError(null);
    try {
      const payload = await authRequest<GameAuthenticationChallenge>('/api/auth/challenges', {
        body: { purpose },
        signal: controller.signal,
      });
      if (generation !== operation.current) return;
      if (
        !/^[A-Za-z0-9_-]{24}$/.test(payload.challengeId) ||
        !/^[0-9]{6,10}$/.test(payload.displayCode) ||
        !Number.isFinite(Date.parse(payload.expiresAt))
      )
        throw new AuthRequestError('invalid_response', 502);
      updateChallenge(payload);
    } catch (cause) {
      if (generation === operation.current)
        setError(cause instanceof AuthRequestError ? cause.code : 'request_failed');
    } finally {
      if (generation === operation.current) setPhase('idle');
    }
  };

  const startPasskey = async () => {
    if (phase !== 'idle') return;
    const generation = ++operation.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    updateChallenge(null);
    setPhase('passkey');
    setError(null);
    try {
      const payload = await authRequest<{ options: PublicKeyCredentialRequestOptionsJSON }>(
        '/api/auth/passkeys/options/authenticate',
        { body: { purpose }, signal: controller.signal },
      );
      if (generation !== operation.current) return;
      if (!payload.options) throw new AuthRequestError('invalid_response', 502);
      ceremony.current = true;
      let credential: AuthenticationResponseJSON;
      try {
        credential = await startAuthentication({ optionsJSON: payload.options });
      } catch (cause) {
        throw new AuthRequestError(webAuthnError(cause), 400);
      } finally {
        if (generation === operation.current) ceremony.current = false;
      }
      if (generation !== operation.current) return;
      completing.current = true;
      setPhase('completing');
      const result = await authRequest<unknown>('/api/auth/passkeys/authenticate', {
        body: { credential },
        signal: controller.signal,
      });
      if (generation === operation.current) finish(result);
    } catch (cause) {
      if (generation !== operation.current) return;
      setError(cause instanceof AuthRequestError ? cause.code : 'request_failed');
      setPhase('idle');
    } finally {
      if (generation === operation.current) completing.current = false;
    }
  };

  return {
    phase,
    challenge,
    error,
    remainingSeconds,
    startGame,
    startPasskey,
    cancel,
    busy: phase !== 'idle' && phase !== 'done',
  };
}

export type AuthenticationFlow = ReturnType<typeof useAuthenticationFlow>;
