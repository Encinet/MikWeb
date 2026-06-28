'use client';

import { ImagePlus, LoaderCircle, Minus, Plus, Send, Trash2, UserPlus, X } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import { AccountLayout } from '@/modules/auth/ui/account-layout';
import type { Building, BuildType, LocalizedText } from '@/modules/building/model/building-types';
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
  formatPercent,
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
  Section,
  StatusBadge,
  TextArea,
  TextField,
} from '@/modules/building-submission/ui/building-submission-form-controls';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import {
  fetchValidatedJson,
  writeFetchValidatedJsonBrowserCache,
} from '@/shared/api/fetch-validated-json';
import { useToast } from '@/shared/ui/feedback/toast-provider';

const BUILDER_COLORS = ['#79b86f', '#55a6d9', '#e0a74f', '#d86b7d', '#9b7bd8', '#4fb6a8'];
const SUBMISSIONS_CACHE_TTL_MS = 45_000;

export function BuildingSubmissionPage() {
  const t = useTranslations('buildingSubmission');
  const locale = useLocale();
  const { account, authenticated } = useAuth();
  const { showToast, updateToast } = useToast();
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

  const loadSubmissions = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (!account) {
        setSubmissions([]);
        return;
      }
      setLoadingSubmissions(true);
      try {
        const result = await fetchValidatedJson({
          url: '/api/account/building-submissions/mine',
          request: { method: 'POST' },
          cache: 'no-store',
          validate: isBuildingSubmissionListResponse,
          timeoutMs: 8000,
          browserCache: {
            force: options.force,
            key: buildingSubmissionsCacheKey(account.playerUuid),
            ttlMs: SUBMISSIONS_CACHE_TTL_MS,
          },
          fallbackErrorMessage: 'Failed to load building submissions',
        });
        if (result.status !== 'success') {
          throw new Error('load_failed');
        }
        setSubmissions(result.data.submissions);
      } catch {
        showToast({ title: t('states.loadFailed'), variant: 'error' });
      } finally {
        setLoadingSubmissions(false);
      }
    },
    [account, showToast, t],
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

    setResolvingPlayer(true);
    try {
      const response = await fetch('/api/account/players/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json().catch(() => ({}))) as { player?: ResolvedPlayer };
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
      showToast({ title: t('states.playerNotFound'), variant: 'error' });
    } finally {
      setResolvingPlayer(false);
    }
  };

  const handlePlayerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    void resolvePlayer();
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
      showToast({ title: t('states.tagRequired'), variant: 'error' });
      return;
    }
    setTags((current) => [...current, { zh, en }]);
    setTagDraft({ zh: '', en: '' });
  };

  const handleImageFiles = async (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;
    if (!account) {
      showToast({ title: t('states.required'), variant: 'error' });
      return;
    }
    if (draftImages.length + selected.length > MAX_BUILDING_SUBMISSION_IMAGES) {
      showToast({ title: t('states.imageLimit'), variant: 'error' });
      return;
    }

    setUploading(true);
    try {
      const drafts: BuildingSubmissionImageDraft[] = [];
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
      setDraftImages((current) => [...current, ...drafts]);
      showToast({ title: t('states.selected'), variant: 'success' });
    } catch (error) {
      showToast({
        title:
          error instanceof Error && error.message === 'image_too_small'
            ? t('states.imageTooSmall')
            : t('states.imageSelectFailed'),
        variant: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (!account) {
      showToast({ title: t('states.required'), variant: 'error' });
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
      showToast({
        title: error instanceof Error ? t(`states.${error.message}`) : t('states.invalid'),
        variant: 'error',
      });
      return;
    }

    setSubmitting(true);
    setUploading(true);
    const toastId = showToast({ title: t('states.uploading'), variant: 'loading', duration: 0 });
    try {
      const uploadedImages = await uploadBuildingSubmissionImageDrafts(
        draftImages,
        account,
        form.nameEn,
      );
      payload = {
        ...payload,
        images: uploadedImages.map((image) => image.url),
      };
      updateToast(toastId, { title: t('states.submitting'), variant: 'loading', duration: 0 });
      const response = await fetch('/api/account/building-submissions', {
        method: 'POST',
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
      updateToast(toastId, { title: t('states.submitted'), variant: 'success', duration: 2600 });
    } catch (error) {
      updateToast(toastId, {
        title: t(submitErrorMessageKey(error)),
        variant: 'error',
        duration: 3200,
      });
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  const resetForm = (currentAccount: AuthAccount | null) => {
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

  return (
    <AccountLayout>
      <section className="account-detail-panel account-detail-panel--flush">
        <div className="building-submission-shell">
          <header className="building-submission-hero">
            <div>
              <p>{t('eyebrow')}</p>
              <h1>{t('title')}</h1>
              <span>{t('subtitle')}</span>
            </div>
            <div className="building-submission-quota">
              <strong>{pendingCount}</strong>
              <span>{t('quota', { max: MAX_PENDING_BUILDING_SUBMISSIONS })}</span>
            </div>
          </header>

          <form className="building-submission-form" onSubmit={submit}>
            <Section title={t('sections.basic')}>
              <TextField
                label={t('fields.nameZh')}
                value={form.nameZh}
                onChange={(value) => updateForm('nameZh', value)}
                required
              />
              <TextField
                label={t('fields.nameEn')}
                value={form.nameEn}
                onChange={(value) => updateForm('nameEn', value)}
                required
              />
              <TextArea
                label={t('fields.descriptionZh')}
                value={form.descriptionZh}
                onChange={(value) => updateForm('descriptionZh', value)}
                required
              />
              <TextArea
                label={t('fields.descriptionEn')}
                value={form.descriptionEn}
                onChange={(value) => updateForm('descriptionEn', value)}
                required
              />
              <div className="building-submission-field building-submission-field--type">
                <span className="building-submission-field-label">{t('fields.buildType')}</span>
                <div className="building-submission-segments">
                  {(['original', 'derivative', 'replica'] as BuildType[]).map((type) => (
                    <button
                      className={form.buildType === type ? 'is-active' : ''}
                      key={type}
                      type="button"
                      onClick={() => updateForm('buildType', type)}
                    >
                      {t(`types.${type}`)}
                    </button>
                  ))}
                </div>
              </div>
              <TextField
                className="building-submission-field--date"
                label={t('fields.buildDate')}
                type="date"
                value={form.buildDate}
                onChange={(value) => updateForm('buildDate', value)}
                required
              />
            </Section>

            <Section
              className="building-submission-section--coordinates"
              title={t('sections.location')}
            >
              <TextField
                label="X"
                type="number"
                value={form.x}
                onChange={(value) => updateForm('x', value)}
                required
              />
              <TextField
                label="Y"
                type="number"
                value={form.y}
                onChange={(value) => updateForm('y', value)}
                required
              />
              <TextField
                label="Z"
                type="number"
                value={form.z}
                onChange={(value) => updateForm('z', value)}
                required
              />
            </Section>

            <Section title={t('sections.builders')}>
              <div className="building-submission-builder-input">
                <UserPlus className="h-4 w-4" />
                <input
                  value={playerInput}
                  placeholder={t('fields.playerPlaceholder')}
                  onBlur={() => void resolvePlayer()}
                  onChange={(event) => setPlayerInput(event.target.value)}
                  onKeyDown={handlePlayerKeyDown}
                />
                {resolvingPlayer ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              </div>
              <div className="building-submission-builder-list">
                {builders.map((builder, index) => (
                  <div
                    className="building-submission-builder-chip"
                    key={builder.uuid}
                    style={builderStyle(index)}
                  >
                    <MinecraftAvatar uuid={builder.uuid} name={builder.name} size={32} />
                    <span className="building-submission-builder-name">{builder.name}</span>
                    <fieldset className="building-submission-builder-stepper">
                      <legend className="sr-only">{t('fields.weight')}</legend>
                      <button
                        aria-label={t('actions.decreaseWeight')}
                        disabled={safeBuilderWeight(builder.weight) <= 1}
                        type="button"
                        onClick={() => adjustBuilderWeight(builder.uuid, -1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <strong>{safeBuilderWeight(builder.weight)}</strong>
                      <button
                        aria-label={t('actions.increaseWeight')}
                        type="button"
                        onClick={() => adjustBuilderWeight(builder.uuid, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </fieldset>
                    <span className="building-submission-builder-percent">
                      {formatPercent(safeBuilderWeight(builder.weight), totalBuilderWeight)}
                    </span>
                    {!builder.locked ? (
                      <button
                        className="building-submission-builder-remove"
                        aria-label={t('actions.remove')}
                        type="button"
                        onClick={() =>
                          setBuilders((current) =>
                            current.filter((item) => item.uuid !== builder.uuid),
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              {builders.length ? (
                <div className="building-submission-builder-summary">
                  <div className="building-submission-builder-meter">
                    {builders.map((builder, index) => (
                      <span
                        key={builder.uuid}
                        style={{
                          ...builderStyle(index),
                          flexGrow: safeBuilderWeight(builder.weight),
                        }}
                      />
                    ))}
                  </div>
                  <div className="building-submission-builder-tools">
                    <span>{t('fields.totalWeight', { total: totalBuilderWeight })}</span>
                    <button type="button" onClick={() => equalizeBuilderWeights()}>
                      {t('actions.equalizeWeights')}
                    </button>
                    <button type="button" onClick={() => normalizeBuilderWeights()}>
                      {t('actions.normalizeWeights')}
                    </button>
                    <button type="button" onClick={() => clearOptionalBuilders()}>
                      {t('actions.clearBuilders')}
                    </button>
                  </div>
                </div>
              ) : null}
            </Section>

            <Section title={t('sections.images')}>
              <label className="building-submission-upload">
                <ImagePlus className="h-5 w-5" />
                <span>{t('actions.uploadImages')}</span>
                <input
                  accept="image/png,image/jpeg,image/webp"
                  disabled={
                    submitting || uploading || draftImages.length >= MAX_BUILDING_SUBMISSION_IMAGES
                  }
                  multiple
                  type="file"
                  onChange={(event) => {
                    void handleImageFiles(event.target.files);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
              <div className="building-submission-images">
                {draftImages.map((image) => (
                  <figure key={image.id}>
                    <Image
                      alt=""
                      height={Math.max(1, image.height)}
                      src={image.previewUrl}
                      unoptimized
                      width={Math.max(1, image.width)}
                    />
                    <figcaption>
                      {image.width}x{image.height}
                    </figcaption>
                    <button
                      aria-label={t('actions.remove')}
                      type="button"
                      onClick={() => removeDraftImage(image.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </figure>
                ))}
              </div>
            </Section>

            <Section title={t('sections.tags')}>
              <TextField
                className="building-submission-field--tag"
                label={t('fields.tagZh')}
                value={tagDraft.zh}
                onChange={(value) => setTagDraft((current) => ({ ...current, zh: value }))}
              />
              <TextField
                className="building-submission-field--tag"
                label={t('fields.tagEn')}
                value={tagDraft.en}
                onChange={(value) => setTagDraft((current) => ({ ...current, en: value }))}
              />
              <button
                className="account-action-button building-submission-add-tag"
                type="button"
                onClick={addTag}
              >
                <Plus className="h-4 w-4" />
                {t('actions.addTag')}
              </button>
              <div className="building-submission-tags">
                {tags.map((tag, index) => (
                  <button
                    key={`${tag.zh}-${tag.en}`}
                    type="button"
                    onClick={() =>
                      setTags((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    {tag.zh} / {tag.en}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </Section>

            {form.buildType !== 'original' ? (
              <Section title={t('sections.source')}>
                <TextField
                  className="building-submission-field--source"
                  label={t('fields.sourceAuthor')}
                  value={form.sourceAuthor}
                  onChange={(value) => updateForm('sourceAuthor', value)}
                  required
                />
                <TextField
                  className="building-submission-field--source"
                  label={t('fields.sourceLink')}
                  value={form.sourceLink}
                  onChange={(value) => updateForm('sourceLink', value)}
                  required
                />
                <TextField
                  className="building-submission-field--source"
                  label={t('fields.sourceNoteZh')}
                  value={form.sourceNoteZh}
                  onChange={(value) => updateForm('sourceNoteZh', value)}
                  required
                />
                <TextField
                  className="building-submission-field--source"
                  label={t('fields.sourceNoteEn')}
                  value={form.sourceNoteEn}
                  onChange={(value) => updateForm('sourceNoteEn', value)}
                  required
                />
              </Section>
            ) : null}

            <div className="building-submission-actions">
              <button
                className="account-action-button"
                type="button"
                onClick={() => resetForm(account)}
              >
                {t('actions.reset')}
              </button>
              <button
                className="account-action-button account-action-button--primary"
                disabled={!canSubmit}
                type="submit"
              >
                {submitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {t('actions.submit')}
              </button>
            </div>
          </form>

          <section className="building-submission-history">
            <div className="building-submission-history__head">
              <h2>{t('history.title')}</h2>
              <button
                className="account-action-button"
                type="button"
                onClick={() => void loadSubmissions()}
              >
                {loadingSubmissions ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {t('actions.refresh')}
              </button>
            </div>
            <div className="building-submission-history__list">
              {submissions.length === 0 ? (
                <p>{t('history.empty')}</p>
              ) : (
                submissions.map((submission) => (
                  <article key={submission.id}>
                    <div>
                      <h3>{localized(submission.payload.name, locale)}</h3>
                      <span>{new Date(submission.createdAt).toLocaleString(locale)}</span>
                      {submission.status === 'rejected' && submission.reviewNote ? (
                        <p className="building-submission-history__note">
                          {t('history.rejectionReason', { reason: submission.reviewNote })}
                        </p>
                      ) : null}
                      {submission.status === 'rejected' && submission.expiresAt ? (
                        <p className="building-submission-history__note">
                          {t('history.expiresAt', {
                            time: new Date(submission.expiresAt).toLocaleString(locale),
                          })}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge
                      status={submission.status}
                      label={t(`status.${submission.status}`)}
                    />
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </AccountLayout>
  );
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
  if (error.message === 'upload_failed') {
    return 'states.uploadFailed';
  }
  return 'states.submitFailed';
}

function builderColor(index: number): string {
  return BUILDER_COLORS[index % BUILDER_COLORS.length];
}

function builderStyle(index: number): CSSProperties & { '--builder-color': string } {
  return { '--builder-color': builderColor(index) };
}

function localized(value: LocalizedText | undefined, locale: string): string {
  if (!value) return '';
  return value[locale] ?? value['zh-CN'] ?? value.en ?? Object.values(value)[0] ?? '';
}

function buildingSubmissionsCacheKey(playerUuid: string): string {
  return `account:building-submissions:${playerUuid}`;
}
