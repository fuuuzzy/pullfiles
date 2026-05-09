import { Router } from "express";
import { runTransfer, cancelTransfer } from "../services/transfer-pipeline.js";
import type { TransferContext } from "../services/transfer-pipeline.js";

export function createTransferRoutes(ctx: TransferContext): Router {
	const router = Router();

	router.post("/start", async (_req, res, next) => {
		try {
			runTransfer(ctx).catch((err) => {
				console.error("[PIPELINE] Unhandled error:", err);
			});

			res.json({ success: true, data: { message: "Transfer started" } });
		} catch (error) {
			next(error);
		}
	});

	router.post("/cancel", (_req, res) => {
		cancelTransfer();
		res.json({ success: true, data: { message: "Transfer cancelled" } });
	});

	return router;
}
