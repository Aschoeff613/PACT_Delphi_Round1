export type SectionName = "Management" | "Communication" | "Diagnostic";


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
