import Link from "next/link";
import type { SectionWithProgress } from "@/lib/types";

const copy: Record<string, string> = {
  Management: "Review management-focused scenarios involving treatment choices, escalation, and workflow implications.",
  Communication: "Rate communication-heavy cases, handoffs, patient interactions, and coordination tasks.",
  Diagnostic: "Assess cases centered on diagnostic reasoning, interpretation, and uncertainty."
};

export function SectionCards({ sections }: { sections: SectionWithProgress[] }) {
  return (
    <div className="section-grid">
      {sections.map((section, index) => {
        const previousSection = index > 0 ? sections[index - 1] : null;
        const lockedReason = previousSection ? `Complete ${previousSection.name} first` : "";
        const sectionComplete = section.progress.total > 0 && section.progress.completed === section.progress.total;

        if (section.locked) {
          return (
            <div key={section.id} className="section-card locked">
              <div className="eyebrow">Section</div>
              <h3>{section.name}</h3>
              <p>{copy[section.name] ?? section.description ?? "Open this section to start reviewing cases."}</p>
              <div className="section-progress">
                <div className="section-progress-labels">
                  <span>{section.progress.completed} of {section.progress.total} completed</span>
                  <span>{section.progress.percentage}%</span>
                </div>
                <div className="section-progress-track">
                  <div className="section-progress-fill" style={{ width: `${section.progress.percentage}%` }} />
                </div>
              </div>
              <span className="section-lock-note">{lockedReason}</span>
            </div>
          );
        }

        return (
          <div key={section.id} className={`section-card-wrapper${sectionComplete ? " section-card-complete" : ""}`}>
            <Link href={`/sections/${section.slug}`} className="section-card">
              <div className="eyebrow">Section</div>
              <h3>{section.name}</h3>
              <p>{copy[section.name] ?? section.description ?? "Open this section to start reviewing cases."}</p>
              <div className="section-progress">
                <div className="section-progress-labels">
                  <span>{section.progress.completed} of {section.progress.total} completed</span>
                  <span>{section.progress.percentage}%</span>
                </div>
                <div className="section-progress-track">
                  <div className="section-progress-fill" style={{ width: `${section.progress.percentage}%` }} />
                </div>
              </div>
              <span className="section-cta">{sectionComplete ? "Review cases" : "Open workspace"}</span>
            </Link>
            {sectionComplete ? (
              <Link href={`/sections/${section.slug}/merge-review`} className="section-merge-cta">
                Go to Merge Review →
              </Link>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
