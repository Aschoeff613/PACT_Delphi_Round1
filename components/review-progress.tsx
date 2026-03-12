export function ReviewProgress({
  completed,
  total
}: {
  completed: number;
  total: number;
}) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="progress-shell">
      <div className="progress-labels">
        <span>{completed} of {total} completed</span>
        <span>{percentage}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
