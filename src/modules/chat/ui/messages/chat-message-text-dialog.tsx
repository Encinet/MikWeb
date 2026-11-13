'use client';

import { TextCursorInput } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { CopyButton } from '@/shared/ui/action/copy-button';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';

export function ChatMessageTextDialog({ text, onClose }: { text: string; onClose: () => void }) {
  const t = useTranslations('chat.messageActions');
  const descriptionId = useId();
  const [selectedText, setSelectedText] = useState('');

  return (
    <AppDialog
      isOpen
      onClose={onClose}
      title={t('selectText')}
      icon={<TextCursorInput className="h-5 w-5" aria-hidden="true" />}
      className="chat-text-selection-dialog"
      descriptionId={descriptionId}
    >
      <div className="flex flex-col gap-4">
        <p id={descriptionId} className="text-sm text-(--theme-text-muted-strong)">
          {t('selectionHint')}
        </p>
        <textarea
          readOnly
          value={text}
          aria-label={t('textLabel')}
          aria-describedby={descriptionId}
          spellCheck={false}
          data-dialog-initial-focus
          className="chat-text-selection-field"
          onSelect={(event) => {
            const field = event.currentTarget;
            setSelectedText(field.value.slice(field.selectionStart, field.selectionEnd));
          }}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <CopyButton value={text} label={t('copy')} showLabel className="ui-action-button" />
          <CopyButton
            value={selectedText}
            label={t('copySelection')}
            showLabel
            disabled={selectedText.length === 0}
            className="ui-action-button ui-action-button--primary"
          />
        </div>
      </div>
    </AppDialog>
  );
}
