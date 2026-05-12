import type { NextFunction, Request, Response } from "express";
import type pino from "pino";

export function createErrorHandler(logger: pino.Logger) {
	return (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
		logger.error({ err }, "unhandled error");
		res.status(500).json({
			success: false,
			error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
		});
	};
}
