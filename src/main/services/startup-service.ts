import type { AppError } from '@shared/ipc/result';

/** Holds startup notices (such as a recovered library) and hands them out once. */
export class StartupService {
  private notices: AppError[];

  constructor(private readonly deps: { notices: AppError[]; exportDir: string }) {
    this.notices = [...deps.notices];
  }

  info(): { notices: AppError[]; exportDir: string } {
    const notices = this.notices;
    this.notices = [];
    return { notices, exportDir: this.deps.exportDir };
  }
}
