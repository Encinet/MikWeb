'use client';

import { ImagePlus, Minus, Plus, Send, Trash2, UserPlus, X } from 'lucide-react';
import Image from 'next/image';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { isMemberRole } from '@/modules/auth/model/auth-access';
import { useAuth } from '@/modules/auth/model/use-auth';
import { AccountLayout } from '@/modules/auth/ui/account-layout';
import { getBuildingPath } from '@/modules/building/lib/building-links';
import { BUILDING_TYPES } from '@/modules/building/model/building-types';
import { MAX_BUILDING_WORLD_NAME_LENGTH } from '@/modules/building/model/building-validation';
import {
  formatBuilderContribution,
  normalizeBuilderWeight,
} from '@/modules/building-submission/model/building-submission-form';
import {
  BUILDING_SUBMISSION_TEXT_LIMITS as textLimits,
  MAX_BUILDING_SUBMISSION_IMAGES,
  MAX_PENDING_BUILDING_SUBMISSIONS,
} from '@/modules/building-submission/model/building-submission-limits';
import { useBuildingSubmissionForm } from '@/modules/building-submission/model/use-building-submission-form';
import {
  Section,
  StatusBadge,
  TextArea,
  TextField,
} from '@/modules/building-submission/ui/building-submission-form-controls';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { getLocalizedText } from '@/shared/i18n/localized-text';
import { Link } from '@/shared/i18n/navigation';
import { isImeComposing } from '@/shared/lib/keyboard-composition';
import { InlineFeedback } from '@/shared/ui/feedback/async-state';
import { ProgressRing } from '@/shared/ui/feedback/loading-state';

const BUILDER_COLORS = ['#79b86f', '#55a6d9', '#e0a74f', '#d86b7d', '#9b7bd8', '#4fb6a8'];

export function BuildingSubmissionPage() {
  const { account } = useAuth();
  const t = useTranslations('buildingSubmission');

  if (!account || isMemberRole(account.role)) return <BuildingSubmissionForm />;

  return (
    <AccountLayout>
      <section className="account-empty-state">
        <h1>{t('title')}</h1>
        <p>{t('states.memberRequired')}</p>
      </section>
    </AccountLayout>
  );
}

function BuildingSubmissionForm() {
  const t = useTranslations('buildingSubmission');
  const buildingT = useTranslations('buildings');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const format = useFormatter();
  const {
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
  } = useBuildingSubmissionForm();

  const handlePlayerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isImeComposing(event.nativeEvent)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    void resolvePlayer();
  };

  return (
    <AccountLayout>
      <section className="account-section">
        <div className="building-submission-shell">
          <header className="building-submission-hero">
            <div>
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
                className="building-submission-field--half"
                label={t('fields.nameZh')}
                maxLength={textLimits.name}
                value={form.nameZh}
                onChange={(value) => updateForm('nameZh', value)}
                required
              />
              <TextField
                className="building-submission-field--half"
                label={t('fields.nameEn')}
                maxLength={textLimits.name}
                value={form.nameEn}
                onChange={(value) => updateForm('nameEn', value)}
                required
              />
              <TextArea
                label={t('fields.descriptionZh')}
                maxLength={textLimits.description}
                value={form.descriptionZh}
                onChange={(value) => updateForm('descriptionZh', value)}
                required
              />
              <TextArea
                label={t('fields.descriptionEn')}
                maxLength={textLimits.description}
                value={form.descriptionEn}
                onChange={(value) => updateForm('descriptionEn', value)}
                required
              />
              <div className="building-submission-field building-submission-field--half">
                <span className="building-submission-field-label">{t('fields.buildType')}</span>
                <div className="building-submission-segments">
                  {BUILDING_TYPES.map((type) => (
                    <button
                      className={form.buildType === type ? 'is-active' : ''}
                      key={type}
                      type="button"
                      onClick={() => updateForm('buildType', type)}
                    >
                      {buildingT(`types.${type}`)}
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
                label={t('fields.world')}
                value={form.world}
                onChange={(value) => updateForm('world', value)}
                maxLength={MAX_BUILDING_WORLD_NAME_LENGTH}
                required
              />
              <TextField
                label="X"
                type="number"
                step="any"
                value={form.x}
                onChange={(value) => updateForm('x', value)}
                required
              />
              <TextField
                label="Y"
                type="number"
                step="any"
                value={form.y}
                onChange={(value) => updateForm('y', value)}
                required
              />
              <TextField
                label="Z"
                type="number"
                step="any"
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
                {isResolvingPlayer ? <ProgressRing size="sm" /> : null}
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
                        disabled={normalizeBuilderWeight(builder.weight) <= 1}
                        type="button"
                        onClick={() => adjustBuilderWeight(builder.uuid, -1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <strong>{normalizeBuilderWeight(builder.weight)}</strong>
                      <button
                        aria-label={t('actions.increaseWeight')}
                        type="button"
                        onClick={() => adjustBuilderWeight(builder.uuid, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </fieldset>
                    <span className="building-submission-builder-percent">
                      {formatBuilderContribution(
                        normalizeBuilderWeight(builder.weight),
                        totalBuilderWeight,
                      )}
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
                          flexGrow: normalizeBuilderWeight(builder.weight),
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
              <InlineFeedback value={feedback.builders} />
            </Section>

            <Section title={t('sections.images')}>
              <label className="building-submission-upload">
                <ImagePlus className="h-5 w-5" />
                <span>{t('actions.uploadImages')}</span>
                <input
                  accept="image/png,image/jpeg,image/webp"
                  disabled={
                    isSubmitting ||
                    isUploading ||
                    draftImages.length >= MAX_BUILDING_SUBMISSION_IMAGES
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
                      disabled={isSubmitting}
                      type="button"
                      onClick={() => removeDraftImage(image.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </figure>
                ))}
              </div>
              <InlineFeedback value={feedback.images} />
            </Section>

            <Section title={t('sections.tags')}>
              <TextField
                className="building-submission-field--tag"
                label={t('fields.tagZh')}
                maxLength={textLimits.tag}
                value={tagDraft.zh}
                onChange={(value) => setTagDraft((current) => ({ ...current, zh: value }))}
              />
              <TextField
                className="building-submission-field--tag"
                label={t('fields.tagEn')}
                maxLength={textLimits.tag}
                value={tagDraft.en}
                onChange={(value) => setTagDraft((current) => ({ ...current, en: value }))}
              />
              <button
                className="ui-action-button building-submission-add-tag"
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
                    {[tag.zh, tag.en].filter(Boolean).join(' / ')}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
              <InlineFeedback value={feedback.tags} />
            </Section>

            <details className="building-submission-source">
              <summary>{buildingT('fields.source')}</summary>
              <div className="building-submission-section__grid">
                <TextField
                  className="building-submission-field--source"
                  label={buildingT('fields.originalAuthor')}
                  maxLength={textLimits.sourceAuthor}
                  value={form.sourceAuthor}
                  onChange={(value) => updateForm('sourceAuthor', value)}
                />
                <TextField
                  className="building-submission-field--source"
                  label={t('fields.sourceLink')}
                  maxLength={textLimits.sourceLink}
                  value={form.sourceLink}
                  onChange={(value) => updateForm('sourceLink', value)}
                />
                <TextField
                  className="building-submission-field--source"
                  label={t('fields.sourceNoteZh')}
                  maxLength={textLimits.sourceNote}
                  value={form.sourceNoteZh}
                  onChange={(value) => updateForm('sourceNoteZh', value)}
                />
                <TextField
                  className="building-submission-field--source"
                  label={t('fields.sourceNoteEn')}
                  maxLength={textLimits.sourceNote}
                  value={form.sourceNoteEn}
                  onChange={(value) => updateForm('sourceNoteEn', value)}
                />
              </div>
            </details>

            <InlineFeedback value={feedback.form} />
            <div className="building-submission-actions">
              <button
                className="ui-action-button"
                type="button"
                disabled={isSubmitting}
                onClick={() => resetForm(account)}
              >
                {t('actions.reset')}
              </button>
              <button
                className="ui-action-button ui-action-button--primary"
                disabled={!canSubmit}
                type="submit"
              >
                {isSubmitting ? <ProgressRing size="sm" /> : <Send className="h-4 w-4" />}
                {t('actions.submit')}
              </button>
            </div>
          </form>

          <section className="building-submission-history">
            <div className="building-submission-history__head">
              <h2>{t('history.title')}</h2>
              <button
                className="ui-action-button"
                type="button"
                disabled={isLoadingSubmissions}
                onClick={() => void loadSubmissions({ force: true })}
              >
                {isLoadingSubmissions ? <ProgressRing size="sm" /> : null}
                {commonT('actions.refresh')}
              </button>
            </div>
            <InlineFeedback value={feedback.history} />
            <div
              className="building-submission-history__list"
              aria-busy={isLoadingSubmissions}
            >
              {submissions.length === 0 && !isLoadingSubmissions && !feedback.history ? (
                <p>{t('history.empty')}</p>
              ) : null}
              {submissions.map(({ id, name, status, reviewNote, expiresAt }) => {
                const title = getLocalizedText(name, locale);
                return (
                  <article key={id}>
                    <div className="building-archive-card__heading">
                      <h3>
                        {status === 'approved' ? (
                          <Link href={getBuildingPath(id)} prefetch={false}>
                            {title}
                          </Link>
                        ) : (
                          title
                        )}
                      </h3>
                      <StatusBadge status={status} label={t(`status.${status}`)} />
                    </div>
                    {reviewNote ? (
                      <p className="building-submission-history__note">
                        {t('history.rejectionReason', { reason: reviewNote })}
                      </p>
                    ) : null}
                    {expiresAt ? (
                      <p className="building-submission-history__expiry">
                        {t('history.expiresAt', {
                          time: format.dateTime(new Date(expiresAt), { dateStyle: 'medium' }),
                        })}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </AccountLayout>
  );
}

function builderColor(index: number): string {
  return BUILDER_COLORS[index % BUILDER_COLORS.length];
}

function builderStyle(index: number): CSSProperties & { '--builder-color': string } {
  return { '--builder-color': builderColor(index) };
}
