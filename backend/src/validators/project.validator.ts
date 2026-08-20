import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional(),
  }),
});

export const addMemberSchema = z.object({
  params: z.object({
    projectId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Invalid project ID',
    }),
  }),
  body: z.object({
    userId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Invalid user ID',
    }),
  }),
});

export const removeMemberSchema = z.object({
  params: z.object({
    projectId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Invalid project ID',
    }),
    userId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Invalid user ID',
    }),
  }),
});

export const updateMembersSchema = z.object({
  params: z.object({
    projectId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Invalid project ID',
    }),
  }),
  body: z.object({
    members: z.array(
      z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
        message: 'Invalid user ID',
      })
    ),
  }),
});
