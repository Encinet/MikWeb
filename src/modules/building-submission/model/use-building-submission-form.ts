'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authRequest } from '@/modules/auth/lib/auth-request';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import type { BuildingInput } from '@/modules/building/model/building-types';
import {
  createBuildingSubmissionImageDraft,
  uploadBuildingSubmissionImageDrafts,
} from '@/modules/building-submission/lib/building-submission-images';
import { buildBuildingSubmissionPayload } from '@/modules/building-submission/lib/building-submission-payload';
import type {
  BuilderDraft,
  BuildingSubmissionImageDraft,
  BuildingSubmissionTagDraft,
} from '@/modules/building-submission/model/building-submission-form';
import {
  createInitialBuildingSubmissionForm,
  ensureSelfBuilder,
  greatestCommonDivisor,
  normalizeBuilderWeight,
} from '@/modules/building-submission/model/building-submission-form';
import {
  BUILDING_SUBMISSION_IMAGE_LIMITS,
  MAX_BUILDING_SUBMISSION_IMAGES,
  MAX_PENDING_BUILDING_SUBMISSIONS,
} from '@/modules/building-submission/model/building-submission-limits';
import type {
  BuildingSubmission,
  BuildingSubmissionListResponse,
} from '@/modules/building-submission/model/building-submission-types';
import {
  isBuildingSubmissionCreateResponse,
  isBuildingSubmissionListResponse,
} from '@/modules/building-submission/model/building-submission-validation';
import { isPlayerIdentity } from '@/modules/player/model/player-validation';
import {
  fetchValidatedJson,
  writeFetchValidatedJsonBrowserCache,
} from '@/shared/api/fetch-validated-json';
import { hasTranslationKey } from '@/shared/i18n/has-translation-key';
import type { FeedbackMessage } from '@/shared/types/feedback';

type SubmissionFeedbackScope = 'form' | 'builders' | 'images' | 'tags' | 'history';

const SUBMISSIONS_CACHE_TTL_MS = 45_000;

export function useBuildingSubmissionForm() {
  const t = useTranslations('buildingSubmission');
  const { account, authenticated } = useAuth();
  const [feedback, setFeedback] = useState<
    Partial<Record<SubmissionFeedbackScope, FeedbackMessage | null>>
  >({});
  const showFeedback = useCallback(
    (scope: SubmissionFeedbackScope, value: FeedbackMessage | null) => {
      setFeedback((current) => ({ ...current, [scope]: value }));
    },
    [],
  );
  const [submissions, setSubmissions] = useState<BuildingSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const [isResolvingPlayer, setIsResolvingPlayer] = useState(false);
  const [tags, setTags] = useState<BuildingSubmissionTagDraft[]>([]);
  const [tagDraft, setTagDraft] = useState<BuildingSubmissionTagDraft>({ zh: '', en: '' });
  const [draftImages, setDraftImages] = useState<BuildingSubmissionImageDraft[]>([]);
  const [builders, setBuilders] = useState<BuilderDraft[]>([]);
  const draftImagesRef = useRef<BuildingSubmissionImageDraft[]>([]);
  const [form, setForm] = useState(() => createInitialBuildingSubmissionForm());

  const accountGeneration = useRef(0);
  const historyRequest = useRef(0);
  const activeAccount = useRef(account?.playerUuid);
  const pendingSubmission = useRef<AbortController | null>(null);
  useEffect(() => {
    accountGeneration.current++;
    activeAccount.current = account?.playerUuid;
    setIsLoadingSubmissions(false);
    setIsResolvingPlayer(false);
    setPlayerInput('');
    pendingSubmission.current?.abort();
    setSubmissions([]);
    setIsSubmitting(false);
    setIsUploading(false);
    setFeedback({});
    setForm(createInitialBuildingSubmissionForm(new Date().toISOString().slice(0, 10)));
    setTags([]);
    setTagDraft({ zh: '', en: '' });
    setBuilders((current) =>
      current.filter((builder) => builder.uuid === account?.playerUuid && builder.locked),
    );
    setDraftImages((current) => {
      for (const image of current) URL.revokeObjectURL(image.previewUrl);
      return [];
    });
    return () => {
      accountGeneration.current++;
      pendingSubmission.current?.abort();
    };
  }, [account?.playerUuid]);

  const loadSubmissions = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (activeAccount.current !== account?.playerUuid) return;
      if (!account) {
        setSubmissions([]);
        return;
      }
      const generation = accountGeneration.current;
      const request = ++historyRequest.current;
      showFeedback('history', null);
      setIsLoadingSubmissions(true);
      try {
        const result = await fetchValidatedJson({
          url: '/api/account/building-submissions/mine',
          request: { method: 'POST' },
          cache: 'no-store',
          validate: (value): value is BuildingSubmissionListResponse =>
            isBuildingSubmissionListResponse(value) &&
            value.submissions.every(
              (submission) => submission.submitterUuid === account.playerUuid,
            ),
          timeoutMs: 8000,
          browserCache: {
            force: options.force,
            key: buildingSubmissionsCacheKey(account.playerUuid),
            ttlMs: SUBMISSIONS_CACHE_TTL_MS,
          },
          fallbackErrorMessage: 'Failed to load building submissions',
        });
        if (generation !== accountGeneration.current || request !== historyRequest.current) return;
        if (result.status !== 'success') {
          throw new Error('load_failed');
        }
        setSubmissions(result.data.submissions);
      } catch {
        if (generation !== accountGeneration.current || request !== historyRequest.current) return;
        showFeedback('history', { message: t('states.loadFailed'), kind: 'error' });
      } finally {
        if (generation === accountGeneration.current && request === historyRequest.current)
          setIsLoadingSubmissions(false);
      }
    },
    [account, showFeedback, t],
  );

  useEffect(() => {
    if (!account) {
      setBuilders([]);
      return;
    }
    setBuilders((current) => ensureSelfBuilder(current, account));
  }, [account]);

  useEffect(() => {
    if (!authenticated) {
      setSubmissions([]);
      return;
    }
    void loadSubmissions();
  }, [authenticated, loadSubmissions]);

  useEffect(() => {
    draftImagesRef.current = draftImages;
  }, [draftImages]);

  useEffect(() => {
    return () => {
      for (const image of draftImagesRef.current) {
        URL.revokeObjectURL(image.previewUrl);
      }
    };
  }, []);

  const pendingCount = useMemo(
    () => submissions.filter((submission) => submission.status === 'pending').length,
    [submissions],
  );
  const totalBuilderWeight = useMemo(
    () => builders.reduce((total, builder) => total + normalizeBuilderWeight(builder.weight), 0),
    [builders],
  );
  const canSubmit =
    authenticated &&
    pendingCount < MAX_PENDING_BUILDING_SUBMISSIONS &&
    !isSubmitting &&
    !isUploading;

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resolvePlayer = async () => {
    const name = playerInput.trim();
    if (!name || isResolvingPlayer) return;

    const generation = accountGeneration.current;
    showFeedback('builders', null);
    setIsResolvingPlayer(true);
    try {
      const payload = await authRequest<{ player?: unknown }>('/api/account/players/resolve', {
        body: { name },
      });
      if (generation !== accountGeneration.current) return;
      if (!isPlayerIdentity(payload.player)) {
        throw new Error('not_found');
      }
      const player = payload.player;
      setBuilders((current) => {
        if (current.some((builder) => builder.uuid === player.uuid)) {
          return current;
        }
        return [...current, { ...player, weight: 1 }];
      });
      setPlayerInput('');
    } catch {
      if (generation !== accountGeneration.current) return;
      showFeedback('builders', { message: t('states.playerNotFound'), kind: 'error' });
    } finally {
      if (generation === accountGeneration.current) setIsResolvingPlayer(false);
    }
  };

  const adjustBuilderWeight = (uuid: string, delta: number) => {
    setBuilders((current) =>
      current.map((builder) =>
        builder.uuid === uuid
          ? { ...builder, weight: normalizeBuilderWeight(builder.weight + delta) }
          : builder,
      ),
    );
  };

  const equalizeBuilderWeights = () => {
    setBuilders((current) => current.map((builder) => ({ ...builder, weight: 1 })));
  };

  const normalizeBuilderWeights = () => {
    setBuilders((current) => {
      const divisor = current.reduce(
        (currentGcd, builder) =>
          greatestCommonDivisor(currentGcd, normalizeBuilderWeight(builder.weight)),
        0,
      );
      if (divisor <= 1) return current;
      return current.map((builder) => ({
        ...builder,
        weight: normalizeBuilderWeight(builder.weight / divisor),
      }));
    });
  };

  const clearOptionalBuilders = () => {
    setBuilders((current) => current.filter((builder) => builder.locked));
  };

  const addTag = () => {
    const zh = tagDraft.zh.trim();
    const en = tagDraft.en.trim();
    if (!zh || !en) {
      showFeedback('tags', { message: t('states.tagRequired'), kind: 'error' });
      return;
    }
    setTags((current) => [...current, { zh, en }]);
    setTagDraft({ zh: '', en: '' });
    showFeedback('tags', null);
  };

  const handleImageFiles = async (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;
    if (!account) {
      showFeedback('images', { message: t('states.required'), kind: 'error' });
      return;
    }
    if (draftImages.length + selected.length > MAX_BUILDING_SUBMISSION_IMAGES) {
      showFeedback('images', { message: t('states.imageLimit'), kind: 'error' });
      return;
    }

    showFeedback('images', null);
    setIsUploading(true);
    const drafts: BuildingSubmissionImageDraft[] = [];
    const generation = accountGeneration.current;
    try {
      for (const file of selected) {
        const draft = await createBuildingSubmissionImageDraft(file);
        if (
          draft.width < BUILDING_SUBMISSION_IMAGE_LIMITS.minWidth ||
          draft.height < BUILDING_SUBMISSION_IMAGE_LIMITS.minHeight
        ) {
          URL.revokeObjectURL(draft.previewUrl);
          throw new Error('image_too_small');
        }
        drafts.push(draft);
      }
      if (generation !== accountGeneration.current) {
        for (const draft of drafts) URL.revokeObjectURL(draft.previewUrl);
        return;
      }
      setDraftImages((current) => [...current, ...drafts]);
    } catch (error) {
      for (const draft of drafts) URL.revokeObjectURL(draft.previewUrl);
      if (generation !== accountGeneration.current) return;
      showFeedback('images', {
        message:
          error instanceof Error && error.message === 'image_too_small'
            ? t('states.imageTooSmall')
            : t('states.imageSelectFailed'),
        kind: 'error',
      });
    } finally {
      if (generation === accountGeneration.current) setIsUploading(false);
    }
  };

  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (!account) {
      showFeedback('form', { message: t('states.required'), kind: 'error' });
      return;
    }

    let payload: BuildingInput;
    try {
      payload = buildBuildingSubmissionPayload(
        form,
        builders,
        tags,
        draftImages.map((image) => image.previewUrl),
      );
    } catch (error) {
      const key = error instanceof Error ? `states.${error.message}` : null;
      showFeedback('form', {
        message: hasTranslationKey(t, key) ? t(key) : t('states.invalid'),
        kind: 'error',
      });
      return;
    }

    if (pendingSubmission.current && !pendingSubmission.current.signal.aborted) return;
    const controller = new AbortController();
    pendingSubmission.current = controller;
    setIsSubmitting(true);
    setIsUploading(true);
    showFeedback('form', { message: t('states.uploading'), kind: 'loading' });
    try {
      const uploadedImages = await uploadBuildingSubmissionImageDrafts(
        draftImages,
        account,
        form.nameEn,
        controller.signal,
      );
      controller.signal.throwIfAborted();
      payload = {
        ...payload,
        images: uploadedImages.map((image) => image.url),
      };
      showFeedback('form', { message: t('states.submitting'), kind: 'loading' });
      const result = await authRequest<unknown>('/api/account/building-submissions', {
        signal: controller.signal,
        body: {
          payload,
          images: uploadedImages.map(({ url, width, height, size, mime }) => ({
            url,
            width,
            height,
            size,
            mime,
          })),
        },
      });
      controller.signal.throwIfAborted();
      if (
        !isBuildingSubmissionCreateResponse(result) ||
        result.submission.submitterUuid !== account.playerUuid
      )
        throw new Error('invalid_response');
      historyRequest.current++;
      setIsLoadingSubmissions(false);
      setSubmissions((current) => {
        const next = [
          result.submission,
          ...current.filter((submission) => submission.id !== result.submission.id),
        ];
        writeFetchValidatedJsonBrowserCache<BuildingSubmissionListResponse>({
          data: { submissions: next },
          key: buildingSubmissionsCacheKey(account.playerUuid),
          ttlMs: SUBMISSIONS_CACHE_TTL_MS,
        });
        return next;
      });
      resetForm(account);
      showFeedback('form', { message: t('states.submitted'), kind: 'success' });
    } catch (error) {
      if (controller.signal.aborted) return;
      showFeedback('form', {
        message: t(submitErrorMessageKey(error)),
        kind: 'error',
      });
    } finally {
      if (pendingSubmission.current === controller) pendingSubmission.current = null;
      if (!controller.signal.aborted) {
        setIsUploading(false);
        setIsSubmitting(false);
      }
    }
  };

  const resetForm = (currentAccount: AuthAccount | null) => {
    setFeedback((current) => ({ history: current.history }));
    setForm(createInitialBuildingSubmissionForm(new Date().toISOString().slice(0, 10)));
    setTags([]);
    setTagDraft({ zh: '', en: '' });
    clearDraftImages();
    setBuilders(currentAccount ? ensureSelfBuilder([], currentAccount) : []);
  };

  const clearDraftImages = () => {
    setDraftImages((current) => {
      for (const image of current) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return [];
    });
  };

  const removeDraftImage = (id: string) => {
    setDraftImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((image) => image.id !== id);
    });
  };

  return {
    feedback,
    account,
    submissions,
    isLoadingSubmissions,
    isSubmitting,
    isUploading,
    playerInput,
    setPlayerInput,
    isResolvingPlayer,
    tags,
    setTags,
    tagDraft,
    setTagDraft,
    draftImages,
    builders,
    setBuilders,
    form,
    pendingCount,
    totalBuilderWeight,
    canSubmit,
    updateForm,
    resolvePlayer,
    adjustBuilderWeight,
    equalizeBuilderWeights,
    normalizeBuilderWeights,
    clearOptionalBuilders,
    addTag,
    handleImageFiles,
    submit,
    resetForm,
    removeDraftImage,
    loadSubmissions,
  };
}

function submitErrorMessageKey(error: unknown) {
  if (!(error instanceof Error)) {
    return 'states.submitFailed';
  }
  if (error.message === 'pending_limit_reached') {
    return 'states.pendingLimit';
  }
  if (error.message === 'image_too_small') {
    return 'states.imageTooSmall';
  }
  if (
    error.message === 'upload_limit_reached' ||
    error.message === 'upload_in_progress' ||
    error.message === 'image_upload_busy'
  )
    return 'states.uploadLimited';
  if (error.message === 'upload_failed') {
    return 'states.uploadFailed';
  }
  return 'states.submitFailed';
}

function buildingSubmissionsCacheKey(playerUuid: string): string {
  return `account:building-submissions:${playerUuid}`;
}
