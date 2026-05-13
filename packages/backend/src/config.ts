import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

const configSchema = z.object({
	BAIDU_ACCESS_TOKEN: z.string().min(1, "BAIDU_ACCESS_TOKEN is required"),
	BAIDU_APP_ID: z.string().min(1, "BAIDU_APP_ID is required"),
	R2_ACCOUNT_ID: z.string().min(1),
	R2_ACCESS_KEY_ID: z.string().min(1),
	R2_SECRET_ACCESS_KEY: z.string().min(1),
	R2_BUCKET_NAME: z.string().min(1),
	R2_CUSTOM_DOMAIN: z.string().url(),
	PORT: z.coerce.number().default(3001),
	DB_PATH: z.string().default("./data/videos.db"),
	TEMP_DIR: z.string().default("/tmp/ls-pull-video"),
	ACCESS_PASSWORD: z.string().min(1, "ACCESS_PASSWORD is required"),
	CONCURRENT_TRANSFERS: z.coerce.number().default(10),
	CONCURRENT_SYNC: z.coerce.number().default(3),
	LOG_DIR: z.string().default("./logs"),
	LOG_LEVEL: z.string().default("info"),
	LOG_RETENTION_DAYS: z.coerce.number().default(30),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
	const result = configSchema.safeParse(process.env);
	if (!result.success) {
		console.error("FATAL: Environment variable validation failed:");
		for (const issue of result.error.issues) {
			console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
		}
		process.exit(1);
	}
	return result.data;
}
