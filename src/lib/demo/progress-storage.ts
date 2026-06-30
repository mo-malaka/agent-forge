import { DEMO_MODES, type DemoModeId, type DemoStepId } from "@/lib/demo/steps";

export const DEMO_PROGRESS_STORAGE_KEY = "agentforge-demo-progress";

export interface DemoProgressSnapshot {
  activeMode: DemoModeId;
  stepStatus: Partial<
    Record<DemoStepId, { status: string; message: string }>
  >;
  savedAt: string;
}

export interface DemoProgressSummary {
  fullSyncCount: number;
  fullSyncTotal: number;
  governCount: number;
  governTotal: number;
  continueHref: string;
  label: string;
  detail: string;
}

export function loadDemoProgress(): DemoProgressSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(DEMO_PROGRESS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as DemoProgressSnapshot;
  } catch {
    return null;
  }
}

export function saveDemoProgress(snapshot: Omit<DemoProgressSnapshot, "savedAt">) {
  if (typeof window === "undefined") {
    return;
  }
  const payload: DemoProgressSnapshot = {
    ...snapshot,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(DEMO_PROGRESS_STORAGE_KEY, JSON.stringify(payload));
}

export function clearDemoProgress() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(DEMO_PROGRESS_STORAGE_KEY);
}

export function summarizeDemoProgress(
  snapshot: DemoProgressSnapshot | null,
): DemoProgressSummary | null {
  if (!snapshot || Object.keys(snapshot.stepStatus).length === 0) {
    return null;
  }

  const fullSyncSteps = DEMO_MODES["full-sync"].steps;
  const governSteps = DEMO_MODES["govern-enforce"].steps;

  const fullSyncCount = fullSyncSteps.filter(
    (step) => snapshot.stepStatus[step]?.status === "success",
  ).length;
  const governCount = governSteps.filter(
    (step) => snapshot.stepStatus[step]?.status === "success",
  ).length;

  const fullSyncComplete = fullSyncCount === fullSyncSteps.length;
  const governComplete = governCount === governSteps.length;

  if (fullSyncComplete && governComplete) {
    return null;
  }

  const tab: DemoModeId =
    fullSyncComplete && !governComplete ? "govern-enforce" : snapshot.activeMode;

  const label =
    tab === "govern-enforce"
      ? "Continue govern + enforce"
      : "Continue full sync";

  const detail =
    fullSyncComplete && !governComplete
      ? `Govern + enforce: ${governCount}/${governSteps.length} steps done`
      : `Full sync: ${fullSyncCount}/${fullSyncSteps.length} steps done`;

  return {
    fullSyncCount,
    fullSyncTotal: fullSyncSteps.length,
    governCount,
    governTotal: governSteps.length,
    continueHref: `/demo?tab=${tab}`,
    label,
    detail,
  };
}
