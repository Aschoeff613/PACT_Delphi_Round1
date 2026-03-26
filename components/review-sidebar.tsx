import Link from "next/link";
import { cn } from "@/lib/utils";

type NavCase = {
  id: string;
  title: string;
  order_index: number;
  status: "not_started" | "in_progress" | "completed";
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
  return (
    <aside className="review-sidebar">
      <div className="sidebar-heading">
        <p>Tasks</p>
      </div>

      <nav className="case-nav">
        {cases.map((item) => (
          <Link
            key={item.id}
            href={`/sections/${sectionSlug}?case=${item.id}`}
            className={cn(
              "case-nav-dot",
              activeCaseId === item.id && "active",
              item.status === "completed" && "done"
            )}
          >
            {item.order_index + 1}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
