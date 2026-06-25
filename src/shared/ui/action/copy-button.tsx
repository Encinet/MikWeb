'use client';

import { Check, Copy } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { useEffect, useRef, useState } from 'react';

type CopyButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> & {
  value: string;
};

async function copyText(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const isCopied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return isCopied;
}

export function CopyButton({ className, value, ...buttonProps }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleClick = async () => {
    const success = await copyText(value);
    if (!success) {
      return;
    }

    setIsCopied(true);
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = window.setTimeout(() => {
      setIsCopied(false);
      resetTimerRef.current = null;
    }, 1500);
  };

  return (
    <button
      type="button"
      {...buttonProps}
      className={['copy-button', isCopied ? 'is-copied' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      aria-label={isCopied ? 'Copied' : 'Copy'}
    >
      {isCopied ? <Check className="copy-button__icon" /> : <Copy className="copy-button__icon" />}
    </button>
  );
}
