import { Router } from "express";
import {
  createTask,
  getTasksByProject,
  updateTask,
  deleteTask,
} from "../controllers/task.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Tasks
router.post("/", authenticate, createTask); // Create task
router.get("/project/:projectId", authenticate, getTasksByProject); // Get all tasks for project
router.put("/:taskId", authenticate, updateTask); // Update task
router.delete("/:taskId", authenticate, deleteTask); // Delete task

export default router;
