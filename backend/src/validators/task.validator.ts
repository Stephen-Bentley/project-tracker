import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    projectId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Invalid projectId',
    }),
    assignedTo: z
      .string()
      .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
        message: 'Invalid userId',
      })
      .optional()
      .nullable(),
    status: z
      .enum(['todo', 'in_progress', 'code_review', 'completed', 'done'])
      .optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    taskId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Invalid taskId',
    }),
  }),
  body: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      status: z
        .enum(['todo', 'in_progress', 'code_review', 'completed', 'done'])
        .optional(),
      assignedTo: z
        .string()
        .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
          message: 'Invalid userId',
        })
        .optional()
        .nullable(),
    })
    .optional(),
});

export const createTaskCommentSchema = z.object({
  params: z.object({
    taskId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Invalid taskId',
    }),
  }),
  body: z.object({
    body: z.string().trim().min(1, 'Comment cannot be empty').max(2000),
  }),
});
