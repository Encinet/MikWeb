'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import type { Building } from '@/modules/building/model/building-types';
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
  gcd,
  MAX_BUILDING_SUBMISSION_IMAGES,
  MAX_PENDING_BUILDING_SUBMISSIONS,
  MIN_BUILDING_SUBMISSION_IMAGE_HEIGHT,
  MIN_BUILDING_SUBMISSION_IMAGE_WIDTH,
  safeBuilderWeight,
} from '@/modules/building-submission/model/building-submission-form';
import type {
  BuildingSubmission,
  BuildingSubmissionCreateResponse,
  BuildingSubmissionListResponse,
  ResolvedPlayer,
} from '@/modules/building-submission/model/building-submission-types';
import { isBuildingSubmissionListResponse } from '@/modules/building-submission/model/building-submission-types';
import {
  fetchValidatedJson,
  writeFetchValidatedJsonBrowserCache,
} from '@/shared/api/fetch-validated-json';
import type { InlineFeedbackValue } from '@/shared/ui/feedback/async-state';

type SubmissionFeedbackScope = 'form' | 'builders' | 'images' | 'tags' | 'history';

const SUBMISSIONS_CACHE_TTL_MS = 45_000;

export function useBuildingSubmissionForm() {
  const t = useTranslations('buildingSubmission');
  const { account, authenticated } = useAuth();
  const [feedback, setFeedback] = useState<
    Partial<Record<SubmissionFeedbackScope, InlineFeedbackValue | null>>
  >({});
  const showFeedback = useCallback(
    (scope: SubmissionFeedbackScope, value: InlineFeedbackValue | null) => {
      setFeedback((current) => ({ ...current, [scope]: value }));
    },
    [],
  );
  const [submissions, setSubmissions] = useState<BuildingSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const [resolvingPlayer, setResolvingPlayer] = useState(false);
  const [tags, setTags] = useState<BuildingSubmissionTagDraft[]>([]);
  const [tagDraft, setTagDraft] = useState<BuildingSubmissionTagDraft>({ zh: '', en: '' });
  const [draftImages, setDraftImages] = useState<BuildingSubmissionImageDraft[]>([]);
  const [builders, setBuilders] = useState<BuilderDraft[]>([]);
  const draftImagesRef = useRef<BuildingSubmissionImageDraft[]>([]);
  const [form, setForm] = useState(createInitialBuildingSubmissionForm);

  const accountGeneration = useRef(0);
  const activeAccount = useRef(account?.playerUuid);
  const pendingSubmission = useRef<AbortController | null>(null);
  useEffect(() => {
    accountGeneration.current++;
    activeAccount.current = account?.playerUuid;
    setLoadingSubmissions(false);
    setResolvingPlayer(false);
    setPlayerInput('');
    pendingSubmission.current?.abort();
    setSubmissions([]);
    setSubmitting(false);
    setUploading(false);
    setFeedback({});
    setForm(createInitialBuildingSubmissionForm());
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
      showFeedback('history', null);
      setLoadingSubmissions(true);
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
        if (generation !== accountGeneration.current) return;
        if (result.status !== 'success') {
          throw new Error('load_failed');
        }
        setSubmissions(result.data.submissions);
      } catch {
        if (generation !== accountGeneration.current) return;
        showFeedback('history', { message: t('states.loadFailed'), kind: 'error' });
      } finally {
        if (generation === accountGeneration.current) setLoadingSubmissions(false);
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
    () => builders.reduce((total, builder) => total + safeBuilderWeight(builder.weight), 0),
    [builders],
  );
  const canSubmit =
    authenticated && pendingCount < MAX_PENDING_BUILDING_SUBMISSIONS && !submitting && !uploading;

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resolvePlayer = async () => {
    const name = playerInput.trim();
    if (!name || resolvingPlayer) return;

    const generation = accountGeneration.current;
    showFeedback('builders', null);
    setResolvingPlayer(true);
    try {
      const response = await fetch('/api/account/players/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json().catch(() => ({}))) as { player?: ResolvedPlayer };
      if (generation !== accountGeneration.current) return;
      if (!response.ok || !payload.player) {
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
      if (generation === accountGeneration.current) setResolvingPlayer(false);
    }
  };

  const adjustBuilderWeight = (uuid: string, delta: number) => {
    setBuilders((current) =>
      current.map((builder) =>
        builder.uuid === uuid
          ? { ...builder, weight: safeBuilderWeight(builder.weight + delta) }
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
        (currentGcd, builder) => gcd(currentGcd, safeBuilderWeight(builder.weight)),
        0,
      );
      if (divisor <= 1) return current;
      return current.map((builder) => ({
        ...builder,
        weight: safeBuilderWeight(builder.weight / divisor),
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
    setUploading(true);
    const drafts: BuildingSubmissionImageDraft[] = [];
    const generation = accountGeneration.current;
    try {
      for (const file of selected) {
        const draft = await createBuildingSubmissionImageDraft(file);
        if (
          draft.width < MIN_BUILDING_SUBMISSION_IMAGE_WIDTH ||
          draft.height < MIN_BUILDING_SUBMISSION_IMAGE_HEIGHT
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
      if (generation === accountGeneration.current) setUploading(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (!account) {
      showFeedback('form', { message: t('states.required'), kind: 'error' });
      return;
    }

    let payload: Building;
    try {
      payload = buildBuildingSubmissionPayload(
        form,
        builders,
        tags,
        draftImages.map((image) => image.previewUrl),
      );
    } catch (error) {
      showFeedback('form', {
        message: error instanceof Error ? t(`states.${error.message}`) : t('states.invalid'),
        kind: 'error',
      });
      return;
    }

    if (pendingSubmission.current && !pendingSubmission.current.signal.aborted) return;
    const controller = new AbortController();
    pendingSubmission.current = controller;
    setSubmitting(true);
    setUploading(true);
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
      const response = await fetch('/api/account/building-submissions', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload,
          images: uploadedImages.map(({ url, width, height, size, mime }) => ({
            url,
            width,
            height,
            size,
            mime,
          })),
        }),
      });
      const result = (await response
        .json()
        .catch(() => ({}))) as BuildingSubmissionCreateResponse & {
        error?: string;
      };
      controller.signal.throwIfAborted();
      if (!response.ok) {
        throw new Error(result.error ?? 'submit_failed');
      }
      setSubmissions((current) => {
        const next = [result.submission, ...current.filter(Boolean)];
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
        setUploading(false);
        setSubmitting(false);
      }
    }
  };

  const resetForm = (currentAccount: AuthAccount | null) => {
    setFeedback((current) => ({ history: current.history }));
    setForm(createInitialBuildingSubmissionForm());
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
    loadingSubmissions,
    submitting,
    uploading,
    playerInput,
    setPlayerInput,
    resolvingPlayer,
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

function submitErrorMessageKey(error: unknown): `states.${string}` {
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
