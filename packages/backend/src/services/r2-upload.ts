import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { R2_PART_SIZE, R2_QUEUE_SIZE } from "@ls-pull-video/shared";
import type { Config } from "../config.js";

export function createR2Client(config: Config) {
	const s3 = new S3Client({
		region: "auto",
		endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: config.R2_ACCESS_KEY_ID,
			secretAccessKey: config.R2_SECRET_ACCESS_KEY,
		},
		forcePathStyle: true,
	});

	return {
		async uploadFile(
			localPath: string,
			r2Key: string,
			contentType: string,
			onProgress?: (loaded: number, total: number) => void,
			signal?: AbortSignal,
		): Promise<string> {
			const fileStats = await stat(localPath);
			const body = createReadStream(localPath);

			const upload = new Upload({
				client: s3,
				params: {
					Bucket: config.R2_BUCKET_NAME,
					Key: r2Key,
					Body: body,
					ContentType: contentType,
					ContentLength: fileStats.size,
				},
				partSize: R2_PART_SIZE,
				queueSize: R2_QUEUE_SIZE,
				leavePartsOnError: false,
			});

			let abortHandler: (() => void) | undefined;
			if (signal) {
				abortHandler = () => {
					upload.abort().catch(() => {
						// ignore abort errors
					});
				};
				signal.addEventListener("abort", abortHandler);
			}

			if (onProgress) {
				upload.on("httpUploadProgress", (evt) => {
					if (evt.loaded !== undefined && evt.total !== undefined) {
						onProgress(evt.loaded, evt.total);
					}
				});
			}

			try {
				await upload.done();
			} finally {
				if (signal && abortHandler) {
					signal.removeEventListener("abort", abortHandler);
				}
			}

			const baseUrl = config.R2_CUSTOM_DOMAIN.replace(/\/$/, "");
			return `${baseUrl}/${r2Key}`;
		},
	};
}

export type R2Client = ReturnType<typeof createR2Client>;
