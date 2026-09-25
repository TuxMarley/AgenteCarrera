export const feedbackCategoryOptions = [
  { value:'technical_specialization', label:'Especialización técnica' },
  { value:'design', label:'Diseño' },
  { value:'writing_and_spelling', label:'Redacción y ortografía' },
  { value:'gdne_focus_and_value', label:'Dimensiones focos de la GDN-e y aportación de valor' },
  { value:'capability_management', label:'Gestión de capacidades' },
  { value:'documentation_quality', label:'Calidad de la documentación' },
  { value:'general_ideas', label:'Ideas generales' },
  { value:'other', label:'Otros' },
] as const;

export type FeedbackCategory = typeof feedbackCategoryOptions[number]['value'];

export const feedbackCategoryLabels: Record<FeedbackCategory, string> = Object.fromEntries(
  feedbackCategoryOptions.map((category) => [category.value, category.label]),
) as Record<FeedbackCategory, string>;

export function isFeedbackCategory(value: string): value is FeedbackCategory {
  return feedbackCategoryOptions.some((category) => category.value === value);
}
