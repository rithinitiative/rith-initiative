interface PostClassificationRecord {
  title?: string | null;
  category?: string | null;
  project_slug?: string | null;
}

const normalize = (value?: string | null) => (value || '').trim().toLowerCase();

export const isSurveyBlogPost = (post: PostClassificationRecord) =>
  normalize(post.category) === 'survey' || normalize(post.title).includes('community survey');

export const isBlogPostRecord = (post: PostClassificationRecord) =>
  !post.project_slug || isSurveyBlogPost(post);

export const isProjectRecord = (post: PostClassificationRecord) =>
  Boolean(post.project_slug) && !isSurveyBlogPost(post);
