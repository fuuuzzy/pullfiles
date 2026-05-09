import { z } from "zod";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

const configSchema = z.object({
	BAIDU_ACCESS_TOKEN: z.string().min(1, "BAIDU_ACCESS_TOKEN is required"),
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
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
	const result = configSchema.safeParse(process.env);
	if (!result.success) {
		console.error("Invalid environment configuration:");
		for (const issue of result.error.issues) {
			console.error(`  ${issue.path.join(".")}: ${issue.message}`);
		}
		process.exit(1);
	}
	return result.data;
}
