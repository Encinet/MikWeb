'use client';

import { Check, ChevronDown, ChevronUp, HeartHandshake, WalletCards } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth/model/use-auth';

const donationOptions = [
  { id: 'starter', amount: 10 },
  { id: 'daily', amount: 30 },
  { id: 'steady', amount: 50 },
  { id: 'longTerm', amount: 100 },
  { id: 'custom', amount: null },
] as const;

interface DonationRecord {
  id: string;
  amount: number;
  message: string;
  playerName: string | null;
  timestamp: string;
}

const donationRecords: DonationRecord[] = [
  {
    id: 'wanderer',
    amount: 50,
    message: '感谢一直维护服务器。',
    playerName: 'BlockWanderer',
    timestamp: '2026-08-23T13:42:00Z',
  },
  {
    id: 'atlas',
    amount: 100,
    message: 'Keep up the great work!',
    playerName: 'Atlas_27',
    timestamp: '2026-08-22T04:16:00Z',
  },
  {
    id: 'cocoa',
    amount: 30,
    message: '期待更多优秀建筑。',
    playerName: 'CocoaBuilder',
    timestamp: '2026-08-21T16:08:00Z',
  },
  {
    id: 'redstone',
    amount: 20,
    message: '祝社区越来越好。',
    playerName: 'RedstoneFox',
    timestamp: '2026-08-20T09:35:00Z',
  },
  {
    id: 'moonlit',
    amount: 66,
    message: 'Thanks to everyone building together.',
    playerName: 'MoonlitSteve',
    timestamp: '2026-08-19T07:21:00Z',
  },
  {
    id: 'maple',
    amount: 10,
    message: '小小支持一下！',
    playerName: null,
    timestamp: '2026-08-18T12:05:00Z',
  },
  {
    id: 'cloud',
    amount: 50,
    message: 'Love this community.',
    playerName: 'CloudCrafter',
    timestamp: '2026-08-17T03:48:00Z',
  },
  {
    id: 'ivy',
    amount: 30,
    message: '服务器加油。',
    playerName: 'IvyStone',
    timestamp: '2026-08-16T15:27:00Z',
  },
  {
    id: 'pixel',
    amount: 100,
    message: 'For the next world backup.',
    playerName: 'PixelHarbor',
    timestamp: '2026-08-15T08:33:00Z',
  },
  {
    id: 'oak',
    amount: 20,
    message: '感谢管理组。',
    playerName: 'OakAndIron',
    timestamp: '2026-08-14T11:19:00Z',
  },
  {
    id: 'nori',
    amount: 50,
    message: '继续做喜欢的事吧。',
    playerName: 'NoriBuilds',
    timestamp: '2026-08-13T06:44:00Z',
  },
  {
    id: 'starry',
    amount: 10,
    message: 'Happy building!',
    playerName: null,
    timestamp: '2026-08-12T17:12:00Z',
  },
  {
    id: 'mossy',
    amount: 30,
    message: '支持服务器日常维护。',
    playerName: 'MossyTower',
    timestamp: '2026-08-11T10:03:00Z',
  },
  {
    id: 'lime',
    amount: 50,
    message: 'Thanks for the good times.',
    playerName: 'LimeBeacon',
    timestamp: '2026-08-10T02:51:00Z',
  },
  {
    id: 'amber',
    amount: 100,
    message: '期待下一次社区活动。',
    playerName: 'AmberRail',
    timestamp: '2026-08-09T14:38:00Z',
  },
  {
    id: 'blue',
    amount: 20,
    message: 'A little help from me.',
    playerName: null,
    timestamp: '2026-08-08T05:29:00Z',
  },
  {
    id: 'quiet',
    amount: 66,
    message: '感谢提供这么棒的建筑环境。',
    playerName: 'QuietCreeper',
    timestamp: '2026-08-07T18:06:00Z',
  },
  {
    id: 'snowy',
    amount: 30,
    message: 'See you in game!',
    playerName: 'SnowyBrick',
    timestamp: '2026-08-06T09:14:00Z',
  },
];

const RECORDS_PER_PAGE = 6;
const ANNUAL_DONATION_GOAL = 12_000;
const totalDonationAmount = donationRecords.reduce((total, record) => total + record.amount, 0);

export default function DonationPage() {
  const t = useTranslations('donation');
  const locale = useLocale();
  const { account, authenticated, isLoading: isLoadingAuth } = useAuth();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [visibleRecordCount, setVisibleRecordCount] = useState(RECORDS_PER_PAGE);
  const [browserTimeZone, setBrowserTimeZone] = useState<string | null>(null);
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: t('currency.code'),
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  });
  const currencyParts = currencyFormatter.formatToParts(0);
  const currencySymbol =
    currencyParts.find((part) => part.type === 'currency')?.value ?? t('currency.code');
  const currencyIsPrefix =
    currencyParts.findIndex((part) => part.type === 'currency') <
    currencyParts.findIndex((part) => part.type === 'integer');
  const goalProgress = Math.min(1, totalDonationAmount / ANNUAL_DONATION_GOAL);
  const goalPercentage = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(goalProgress);
  const formattedGoalAmount = currencyFormatter.format(totalDonationAmount);
  const formattedGoalTarget = currencyFormatter.format(ANNUAL_DONATION_GOAL);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: browserTimeZone ?? 'UTC',
  });
  const browserTimeZoneLabel = browserTimeZone;
  const selectedOption = donationOptions.find((option) => option.id === selectedOptionId) ?? null;
  const parsedCustomAmount = Number(customAmount);
  const customAmountValue =
    customAmount.trim() !== '' &&
    Number.isSafeInteger(parsedCustomAmount) &&
    parsedCustomAmount > 0 &&
    parsedCustomAmount <= 1_000_000
      ? parsedCustomAmount
      : null;
  const selectedDonationAmount =
    selectedOption === null
      ? null
      : selectedOption.amount === null
        ? customAmountValue
        : selectedOption.amount;
  const formattedSelectedAmount =
    selectedDonationAmount === null ? null : currencyFormatter.format(selectedDonationAmount);
  const hasInvalidCustomAmount =
    selectedOption?.amount === null && customAmount.trim() !== '' && customAmountValue === null;
  const amountPrompt =
    selectedOption === null ? t('options.selectAmount') : t('options.enterAmount');
  const visibleDonationRecords = donationRecords.slice(0, visibleRecordCount);
  const remainingRecordCount = Math.max(0, donationRecords.length - visibleRecordCount);

  useEffect(() => {
    try {
      setBrowserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    } catch {
      setBrowserTimeZone('UTC');
    }
  }, []);

  return (
    <div className="donation-page page-shell page-shell-stable">
      <div className="donation-page__inner page-shell-content">
        <header className="content-page-hero donation-page__hero">
          <div>
            <p className="content-page-hero__eyebrow">{t('hero.eyebrow')}</p>
            <h1>{t('hero.title')}</h1>
            <p>{t('hero.description')}</p>
          </div>
          <div className="donation-goal">
            <div className="donation-goal__header">
              <span id="donation-goal-title">{t('goal.title')}</span>
              <strong>{goalPercentage}</strong>
            </div>
            <div
              className="donation-goal__track"
              role="progressbar"
              aria-labelledby="donation-goal-title"
              aria-valuemin={0}
              aria-valuemax={ANNUAL_DONATION_GOAL}
              aria-valuenow={Math.min(totalDonationAmount, ANNUAL_DONATION_GOAL)}
              aria-valuetext={`${formattedGoalAmount} / ${formattedGoalTarget}`}
            >
              <span style={{ width: `${goalProgress * 100}%` }} />
            </div>
            <div className="donation-goal__amounts">
              <strong>{formattedGoalAmount}</strong>
              <span>/ {formattedGoalTarget}</span>
            </div>
          </div>
        </header>

        <div className="donation-page__content">
          <form
            className="ui-card-surface donation-section donation-form"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="donation-section__header">
              <span className="donation-section__icon">
                <WalletCards aria-hidden="true" />
              </span>
              <div>
                <h2>{t('options.title')}</h2>
                <p>{t('options.description')}</p>
              </div>
            </div>

            <fieldset className="donation-options">
              <legend className="sr-only">{t('options.title')}</legend>
              {donationOptions.map((option) => {
                const isSelected = selectedOptionId === option.id;

                if (option.amount === null) {
                  return (
                    <div
                      key={option.id}
                      className={`donation-option donation-option--custom${isSelected ? ' is-selected' : ''}${hasInvalidCustomAmount ? ' is-invalid' : ''}`}
                    >
                      <input
                        id="donation-amount-custom"
                        className="donation-option__radio sr-only"
                        type="radio"
                        name="donationAmount"
                        value={option.id}
                        checked={isSelected}
                        onChange={() => setSelectedOptionId(option.id)}
                      />
                      <span className="donation-option__topline">
                        <label htmlFor="donation-amount-custom">
                          <strong>{t('options.customAmount')}</strong>
                        </label>
                        {isSelected && customAmountValue !== null ? (
                          <Check aria-hidden="true" />
                        ) : null}
                      </span>
                      <label className="donation-option__custom-control">
                        {currencyIsPrefix ? <span>{currencySymbol}</span> : null}
                        <input
                          type="number"
                          inputMode="numeric"
                          min={isSelected ? 1 : undefined}
                          max={isSelected ? 1_000_000 : undefined}
                          step={isSelected ? 1 : 'any'}
                          value={customAmount}
                          aria-label={t('options.customInputLabel')}
                          aria-describedby={
                            hasInvalidCustomAmount ? 'donation-custom-amount-error' : undefined
                          }
                          aria-invalid={hasInvalidCustomAmount}
                          onChange={(event) => {
                            setSelectedOptionId(option.id);
                            setCustomAmount(event.target.value);
                          }}
                        />
                        {!currencyIsPrefix ? <span>{currencySymbol}</span> : null}
                      </label>
                      {hasInvalidCustomAmount ? (
                        <small
                          id="donation-custom-amount-error"
                          className="donation-option__custom-error"
                        >
                          {t('options.customAmountRange', {
                            minimum: currencyFormatter.format(1),
                            maximum: currencyFormatter.format(1_000_000),
                          })}
                        </small>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <label
                    key={option.id}
                    className={`donation-option${isSelected ? ' is-selected' : ''}`}
                  >
                    <input
                      className="donation-option__radio sr-only"
                      type="radio"
                      name="donationAmount"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => setSelectedOptionId(option.id)}
                    />
                    <span className="donation-option__topline">
                      <strong>{currencyFormatter.format(option.amount)}</strong>
                      {isSelected ? <Check aria-hidden="true" /> : null}
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <div className="donation-form__fields">
              <label className="donation-field donation-field--message">
                <span>
                  {t('form.message')}
                  <small>{t('form.optional')}</small>
                </span>
                <textarea
                  value={message}
                  rows={3}
                  maxLength={120}
                  onChange={(event) => setMessage(event.target.value)}
                />
                <small className="donation-field__count">{message.length}/120</small>
              </label>
            </div>

            <p className="donation-form__notice">
              {isLoadingAuth
                ? t('form.identityLoading')
                : authenticated && account
                  ? t('form.publicNoticeAuthenticated')
                  : t('form.publicNoticeAnonymous')}
            </p>

            <div className="donation-action">
              <div>
                <span>{t('options.selectionLabel')}</span>
                <strong>{formattedSelectedAmount ?? amountPrompt}</strong>
              </div>
              <button type="submit" disabled={isLoadingAuth || selectedDonationAmount === null}>
                <HeartHandshake aria-hidden="true" />
                {formattedSelectedAmount === null
                  ? amountPrompt
                  : t('options.action', { amount: formattedSelectedAmount })}
              </button>
            </div>
          </form>

          <section className="ui-card-surface donation-section">
            <div className="donation-records__header">
              <div className="donation-section__header">
                <span className="donation-section__icon">
                  <HeartHandshake aria-hidden="true" />
                </span>
                <div>
                  <h2>{t('records.title')}</h2>
                  <p>
                    {browserTimeZoneLabel
                      ? t('records.descriptionWithTimeZone', { timeZone: browserTimeZoneLabel })
                      : t('records.description')}
                  </p>
                </div>
              </div>
              <span className="donation-records__count">
                {t('records.count', { count: donationRecords.length })}
              </span>
            </div>

            <div className="donation-record-list">
              <div className="donation-record-list__labels" aria-hidden="true">
                <span>{t('records.columns.donor')}</span>
                <span>{t('records.columns.message')}</span>
                <span>{t('records.columns.date')}</span>
                <span>{t('records.columns.amount')}</span>
              </div>

              {donationRecords.length > 0 ? (
                <ul aria-label={t('records.title')}>
                  {visibleDonationRecords.map((record) => (
                    <li key={record.id} className="donation-record">
                      <div className="donation-record__donor">
                        <span className="sr-only">{t('records.columns.donor')}: </span>
                        <strong>{record.playerName ?? t('records.anonymous')}</strong>
                      </div>
                      <p className="donation-record__message">
                        <span className="sr-only">{t('records.columns.message')}: </span>
                        {record.message}
                      </p>
                      <time dateTime={record.timestamp}>
                        <span className="sr-only">{t('records.columns.date')}: </span>
                        {browserTimeZone === null
                          ? null
                          : dateFormatter.format(new Date(record.timestamp))}
                      </time>
                      <data value={record.amount}>
                        <span className="sr-only">{t('records.columns.amount')}: </span>
                        {currencyFormatter.format(record.amount)}
                      </data>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="donation-records__empty">
                  <HeartHandshake aria-hidden="true" />
                  <p>{t('records.empty')}</p>
                </div>
              )}

              {donationRecords.length > RECORDS_PER_PAGE ? (
                <div className="donation-load-more">
                  <span className="donation-load-more__status" aria-live="polite">
                    {t('records.shownCount', {
                      shown: visibleDonationRecords.length,
                      total: donationRecords.length,
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleRecordCount((count) =>
                        remainingRecordCount > 0
                          ? Math.min(donationRecords.length, count + RECORDS_PER_PAGE)
                          : RECORDS_PER_PAGE,
                      )
                    }
                  >
                    <span>
                      {remainingRecordCount > 0
                        ? t('records.loadMore', {
                            count: Math.min(RECORDS_PER_PAGE, remainingRecordCount),
                          })
                        : t('records.collapse')}
                    </span>
                    {remainingRecordCount > 0 ? (
                      <ChevronDown aria-hidden="true" />
                    ) : (
                      <ChevronUp aria-hidden="true" />
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
