import type { NextFunction, Request, Response } from "express";

declare module "express-session" {
	interface SessionData {
		authenticated?: boolean;
	}
}

export function createAuthMiddleware(_password: string) {
	return (req: Request, res: Response, next: NextFunction): void => {
		if (!req.session || !req.session.authenticated) {
			res.status(401).json({ success: false, error: "Unauthorized" });
			return;
		}
		next();
	};
}
