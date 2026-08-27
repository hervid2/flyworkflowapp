import { LoggerService, LogLevel } from '@nestjs/common';

/**
 * One JSON object per line to stdout/stderr — CloudWatch treats each Lambda
 * stdout/stderr line as a separate log event, so this shape is what makes
 * fields (level, context) queryable in CloudWatch Logs Insights instead of
 * free-text grepping. Used in production only (see `bootstrap.ts#createLogger`);
 * local dev/CI keep Nest's readable console logger.
 */
export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ? { context } : {}),
      ...(trace ? { trace } : {}),
    };
    const line = JSON.stringify(entry) + '\n';
    if (level === 'error') {
      process.stderr.write(line);
    } else {
      process.stdout.write(line);
    }
  }
}
