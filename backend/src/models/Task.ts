import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface ITask extends Document {
  title: string;
  description?: string;
  project: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  status: TaskStatus;
  createdBy: mongoose.Types.ObjectId;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done'],
      default: 'todo'
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

const Task = mongoose.model<ITask>('Task', TaskSchema);
export default Task;
