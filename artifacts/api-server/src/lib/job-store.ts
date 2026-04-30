export interface JobProgress {
  userId: number;
  jobId: string;
  processed: number;
  total: number;
  currentStep: string;
  status: "processing" | "done" | "error";
  analysisId: number | null;
  errorMsg: string | null;
  createdAt: number;
}

const _store = new Map<string, JobProgress>();

export function createJob(userId: number, total: number): string {
  const jobId = crypto.randomUUID();
  _store.set(jobId, {
    userId,
    jobId,
    processed: 0,
    total,
    currentStep: "",
    status: "processing",
    analysisId: null,
    errorMsg: null,
    createdAt: Date.now(),
  });
  return jobId;
}

export function updateJob(
  jobId: string,
  patch: Partial<Pick<JobProgress, "processed" | "currentStep" | "status" | "analysisId" | "errorMsg">>
): void {
  const job = _store.get(jobId);
  if (!job) return;
  Object.assign(job, patch);
}

export function getJob(jobId: string): JobProgress | undefined {
  return _store.get(jobId);
}

export function deleteJobLater(jobId: string, delayMs = 10 * 60 * 1000): void {
  const t = setTimeout(() => _store.delete(jobId), delayMs);
  if ((t as any).unref) (t as any).unref();
}
