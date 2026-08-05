import Link from "next/link";
import type { SectionWithProgress } from "@/lib/types";

// Falls back to sections.description, so a section without an entry still
// renders sensible copy.
const copy: Record<string, string> = {
  "Cognitive Tasks":
    "Rate all 17 candidate cognitive tasks. Each is graded on its own, grounded by one Emergency Department and one Primary Care example."
};

export function SectionCards({ sections }: { sections: SectionWithProgress[] }) {
  return (
    <div className="section-grid">
      {sections.map((section) => {
        if (section.locked) {
          return (
            <div key={section.id} className="section-card locked">
              <div className="eyebrow">Section</div>
              <h3>{section.name}</h3>
              <p>{copy[section.name] ?? section.description ?? "Open this section to start reviewing tasks."}</p>
              <div className="section-progress">
                <div className="section-progress-labels">
                  <span>{section.progress.completed} of {section.progress.total} completed</span>
                  <span>{section.progress.percentage}%</span>
                </div>
                <div className="section-progress-track">
                  <div className="section-progress-fill" style={{ width: `${section.progress.percentage}%` }} />
                </div>
              </div>
            </div>
          );
        }

        const isComplete = section.progress.total > 0 && section.progress.completed === section.progress.total;

        return (
          <Link key={section.id} href={`/sections/${section.slug}`} className="section-card-wrapper">
            <div className="section-card clickable">
              <div className="eyebrow">Section</div>
              <h3>{section.name}</h3>
              <p>{copy[section.name] ?? section.description ?? "Open this section to start reviewing tasks."}</p>
              <div className="section-progress">
                <div className="section-progress-labels">
                  <span>{section.progress.completed} of {section.progress.total} completed</span>
                  <span>{section.progress.percentage}%</span>
                </div>
                <div className="section-progress-track">
                  <div className="section-progress-fill" style={{ width: `${section.progress.percentage}%` }} />
                </div>
              </div>
              <span className="section-cta">Open workspace</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
