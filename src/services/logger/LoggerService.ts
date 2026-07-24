export class LoggerService {
  private prefix: string;

  constructor(prefix = '[PartyPlay]') {
    this.prefix = prefix;
  }

  public debug(message: string, ...args: any[]): void {
    console.debug(`${this.prefix} 🐛 ${message}`, ...args);
  }

  public info(message: string, ...args: any[]): void {
    console.info(`${this.prefix} ℹ️ ${message}`, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix} ⚠️ ${message}`, ...args);
  }

  public error(message: string, ...args: any[]): void {
    console.error(`${this.prefix} ❌ ${message}`, ...args);
  }

  public measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    this.debug(`[Perf] ${name} took ${(end - start).toFixed(2)}ms`);
    return result;
  }
}
