import { join } from "node:path";
import pino from "pino";

export interface LoggerOptions {
	logDir: string;
	level: string;
	retentionDays: number;
}

export function createLogger(opts: LoggerOptions): pino.Logger {
	const transport = pino.transport({
		targets: [
			{
				target: "pino-roll",
				level: opts.level,
				options: {
					file: join(opts.logDir, "app"),
					frequency: "daily",
					dateFormat: "yyyy-MM-dd",
					mkdir: true,
					limit: { count: opts.retentionDays },
				},
			},
			{
				target: "pino/file",
				level: opts.level,
				options: { destination: 1 },
			},
		],
	});

	return pino({ level: opts.level }, transport);
}
