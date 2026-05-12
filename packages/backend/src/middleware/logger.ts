import type { NextFunction, Request, Response } from "express";
import type pino from "pino";

export function createLoggerMiddleware(logger: pino.Logger) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const start = Date.now();

		res.on("finish", () => {
			const duration = Date.now() - start;
			logger.info(
				{
					method: req.method,
					url: req.originalUrl,
					status: res.statusCode,
					duration,
				},
				"request",
			);
		});

		next();
	};
}
