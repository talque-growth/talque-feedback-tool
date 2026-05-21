import type { FeedbackFormData } from "./properties";

const PREFIX = "talque-feedback-";

type StoredDraft = {
  data: FeedbackFormData;
  savedAt: number;
};

export function draftKey(dealId: string) {
  return `${PREFIX}${dealId}`;
}

export function saveDraft(dealId: string, data: FeedbackFormData) {
  if (typeof window === "undefined") return;
  const payload: StoredDraft = { data, savedAt: Date.now() };
  try {
    window.localStorage.setItem(draftKey(dealId), JSON.stringify(payload));
  } catch {
    // localStorage full or disabled — ignore silently
  }
}

export function loadDraft(dealId: string): StoredDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(dealId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredDraft;
  } catch {
    return null;
  }
}

export function clearDraft(dealId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(draftKey(dealId));
}
