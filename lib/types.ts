export type SectionName = "Management" | "Communication" | "Diagnostic";

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  affiliation_title: string | null;
  institution: string | null;
  title: string | null;
  role: "reviewer" | "admin";
};

export type Reviewer = {
  id: string;
  code: string;
  display_name: string;
  last_name: string;
  email: string | null;
  institution: string | null;
  title: string | null;
  role: "reviewer" | "admin";
  locked_at: string | null;
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
  user_id: string | null;
  reviewer_id: string | null;
  case_id: string;
  clinical_relevance: number | null;
  performance_gap: number | null;
  ai_relevance: number | null;
  comment: string | null;
  marked_for_discussion: boolean;
  completed_at: string | null;
  updated_at: string | null;
};
