import Link from "next/link";

export function ReviewProgress({
  completed,
  total,
  mergeReviewHref
}: {
  completed: number;
  total: number;
  mergeReviewHref?: string | null;
}) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const isComplete = total > 0 && completed === total;

  return (
    <div className="progress-shell">
      <div className="progress-labels">
        <span>{completed} of {total} completed</span>
        <span>{percentage}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
      {isComplete && mergeReviewHref ? (
        <div className="progress-complete-cta">
          <span className="progress-complete-label">All cases complete</span>
          <Link href={mergeReviewHref} className="primary-button progress-merge-button">
            Go to Merge Review →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
