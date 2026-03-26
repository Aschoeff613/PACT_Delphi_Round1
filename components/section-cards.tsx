import Link from "next/link";
import type { SectionWithProgress } from "@/lib/types";

const copy: Record<string, string> = {
  Management: "Review management-focused scenarios involving treatment choices, escalation, and workflow implications.",
  Communication: "Rate communication-heavy tasks, handoffs, patient interactions, and coordination.",
  Diagnostic: "Assess tasks centered on diagnostic reasoning, interpretation, and uncertainty."
};

const AVAILABLE_SECTIONS = new Set(["management"]);

export function SectionCards({ sections }: { sections: SectionWithProgress[] }) {
  return (
    <div className="section-grid">
      {sections.map((section) => {
        const isAvailable = AVAILABLE_SECTIONS.has(section.slug);

        if (!isAvailable) {
          return (
            <div key={section.id} className="section-card locked coming-soon">
              <div className="eyebrow">Section</div>
              <h3>{section.name}</h3>
              <p>{copy[section.name] ?? section.description ?? "Open this section to start reviewing tasks."}</p>
              <span className="section-lock-note">Coming soon</span>
            </div>
          );
        }

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
