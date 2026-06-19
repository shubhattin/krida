/** This is scoped location for this project files in the bucket */
export const PROJECT_S3_ALIAS = '002_krida' as const;

/** List of games in the project */
export const KRIDAS = ['padavali'] as const;

/** CDN URL for the project */
const CLOUDFRONT_URL = process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL;

/** Get the CDN URL for a given S3 key */
export const getCDNUrl = (s3_key: string) => {
  return `${CLOUDFRONT_URL ?? ''}/${s3_key}`;
};
