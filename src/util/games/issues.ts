export type GameIssueSeverity = 'error' | 'warning';

export type GameIssue = {
  severity: GameIssueSeverity;
  code: string;
  message: string;
  path?: string;
};

export type GameAnalysis = {
  errors: GameIssue[];
  warnings: GameIssue[];
  canSave: boolean;
  canList: boolean;
};

export function issue(
  severity: GameIssueSeverity,
  code: string,
  message: string,
  path?: string
): GameIssue {
  return path ? { severity, code, message, path } : { severity, code, message };
}

export function analysisFrom(errors: GameIssue[], warnings: GameIssue[], canList: boolean) {
  return {
    errors,
    warnings,
    canSave: errors.length === 0,
    canList: errors.length === 0 && canList
  } satisfies GameAnalysis;
}
