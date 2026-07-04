// Minimal toast pub/sub (client-side), same pattern as apiCallLog. Rendered by
// components/ui/Toaster.tsx; used by the auto-rebalance loop and fill polling.

export type ToastTone = "success" | "danger" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
  createdAt: number;
}

const AUTO_DISMISS_MS = 8000;
const MAX_TOASTS = 4;

const EMPTY: Toast[] = [];
let toasts: Toast[] = EMPTY;
const listeners = new Set<() => void>();

let counter = 0;
function nextId(): string {
  counter += 1;
  return `t${Date.now().toString(36)}${counter.toString(36)}`;
}

function emit(): void {
  listeners.forEach((l) => l());
}

export function addToast(partial: Omit<Toast, "id" | "createdAt">): void {
  const toast: Toast = { id: nextId(), createdAt: Date.now(), ...partial };
  toasts = [toast, ...toasts].slice(0, MAX_TOASTS);
  emit();
  setTimeout(() => dismissToast(toast.id), AUTO_DISMISS_MS);
}

export function dismissToast(id: string): void {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function getToasts(): Toast[] {
  return toasts;
}

export function getEmptyToasts(): Toast[] {
  return EMPTY;
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
