import Link from "next/link";
import { cn } from "@/lib/utils";

type NavCase = {
  id: string;
  title: string;
  order_index: number;
  status: "not_started" | "in_progress" | "completed";
};

const labels = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed"
};

export function ReviewSidebar({
  sectionSlug,
  cases,
  activeCaseId
}: {
  sectionSlug: string;
  cases: NavCase[];
  activeCaseId: string;
}) {
  const completed = cases.filter((item) => item.status === "completed").length;
  const inProgress = cases.filter((item) => item.status === "in_progress").length;

  return (
    <aside className="review-sidebar">
      <div className="sidebar-heading">
        <div className="eyebrow">Cases</div>
        <h2>Cognitive tasks</h2>
        <p>{completed} completed, {inProgress} in progress</p>
      </div>

      <div className="sidebar-summary">
        <div className="summary-chip">
          <span className="summary-label">Total</span>
          <strong>{cases.length}</strong>
        </div>
        <div className="summary-chip">
          <span className="summary-label">Done</span>
          <strong>{completed}</strong>
        </div>
      </div>

      <nav className="case-nav">
        {cases.map((item) => (
          <Link
            key={item.id}
            href={`/sections/${sectionSlug}?case=${item.id}`}
            className={cn("case-nav-item", activeCaseId === item.id && "active")}
          >
            <div className="case-nav-row">
              <span className="case-index">{item.order_index + 1}</span>
              <div className="case-nav-copy">
                <strong>{item.title}</strong>
              </div>
            </div>
            <span className={cn("case-status", item.status)}>{labels[item.status]}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
