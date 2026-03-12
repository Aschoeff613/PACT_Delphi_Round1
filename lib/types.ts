export type SectionName = "Management" | "Communication" | "Diagnostic";

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  affiliation_title: string | null;
  role: "reviewer" | "admin";
};

export type Section = {
  id: string;
  slug: string;
  name: SectionName;
  description: string | null;
};

export type SectionWithProgress = Section & {
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  locked: boolean;
};

export type CaseRecord = {
  id: string;
  section_id: string;
  title: string;
  scenario: string;
  task_definition: string;
  order_index: number;
};

export type Rating = {
  id: string;
  user_id: string;
  case_id: string;
  risk_severity: number | null;
  cognitive_complexity: number | null;
  performance_variability: number | null;
  ai_relevance: number | null;
  comment: string | null;
  marked_for_discussion: boolean;
  completed_at: string | null;
  updated_at: string | null;
};
