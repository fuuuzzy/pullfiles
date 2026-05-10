import type { NextFunction, Request, Response } from "express";

export function createAuthMiddleware(password: string) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const authHeader = req.headers.authorization;

		if (!authHeader || authHeader !== `Bearer ${password}`) {
			res.status(401).json({ success: false, error: "Unauthorized" });
			return;
		}

		next();
	};
}
