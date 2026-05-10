import { Router } from "express";
import type { TransferContext } from "../services/transfer-pipeline.js";
import { cancelTransfer, getTransferStatus, runTransfer } from "../services/transfer-pipeline.js";

export function createTransferRoutes(ctx: TransferContext): Router {
	const router = Router();

	router.get("/status", (_req, res) => {
		res.json({ success: true, data: getTransferStatus() });
	});

	router.post("/start", async (_req, res, next) => {
		try {
			if (getTransferStatus().isRunning) {
				res.status(400).json({ success: false, error: "Transfer is already running" });
				return;
			}

			runTransfer(ctx).catch((_err) => {});

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
