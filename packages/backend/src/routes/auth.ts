import { Router } from "express";
import type { Request, Response } from "express";
import type { Router as ExpressRouter } from "express";

export function createLoginRouter(password: string): ExpressRouter {
	const router = Router();

	router.post("/login", (req: Request, res: Response) => {
		const { password: inputPassword } = req.body as { password?: string };

		if (!inputPassword || inputPassword !== password) {
			res.status(401).json({ success: false, error: "Invalid password" });
			return;
		}

		req.session.authenticated = true;
		req.session.save((err: Error | null) => {
			if (err) {
				res.status(500).json({ success: false, error: "Session error" });
				return;
			}
			res.json({ success: true });
		});
	});

	return router;
}

export function createLogoutRouter(): ExpressRouter {
	const router = Router();

	router.post("/logout", (req: Request, res: Response) => {
		req.session.destroy((err: Error | null) => {
			if (err) {
				res.status(500).json({ success: false, error: "Logout failed" });
				return;
			}
			res.json({ success: true });
		});
	});

	return router;
}

export function createCheckAuthRouter(): ExpressRouter {
	const router = Router();

	router.get("/check", (req: Request, res: Response) => {
		if (req.session?.authenticated) {
			res.json({ success: true, authenticated: true });
		} else {
			res.json({ success: true, authenticated: false });
		}
	});

	return router;
}