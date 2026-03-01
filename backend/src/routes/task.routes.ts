import { Router } from "express";
import {
  createTask,
  getTasksByProject,
  updateTask,
  deleteTask,
  assignUserToTask, // 👈 new import
} from "../controllers/task.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Tasks
router.post("/", authenticate, createTask); // Create task
router.get("/project/:projectId", authenticate, getTasksByProject); // Get all tasks for project
router.put("/:taskId", authenticate, updateTask); // Update task
router.delete("/:taskId", authenticate, deleteTask); // Delete task
router.put("/:taskId/assign", authenticate, assignUserToTask); // Add user to task

export default router;
