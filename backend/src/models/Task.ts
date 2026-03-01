import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface ITask extends Document {
  title: string;
  description?: string;
  project: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId | null;
  status: TaskStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      trim: true
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done'],
      default: 'todo',
      index: true
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Task = mongoose.model<ITask>('Task', TaskSchema);
export default Task;
