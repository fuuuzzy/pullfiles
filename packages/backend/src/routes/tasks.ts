import { Router } from "express";
import type { TasksRepo } from "../db/tasks.js";

export function createTasksRoutes(tasksRepo: TasksRepo): Router {
	const router = Router();

	router.get("/", (_req, res) => {
		const tasks = tasksRepo.list();
		res.json({ success: true, data: tasks });
	});

	router.get("/:id", (req, res) => {
		const task = tasksRepo.getById(Number(req.params.id));
		if (!task) {
			res.status(404).json({ success: false, error: "Task not found" });
			return;
		}
		res.json({ success: true, data: task });
	});

	return router;
}
