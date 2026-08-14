import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'code_review'
  | 'completed'
  | 'done';

export interface ITaskImage {
  _id?: mongoose.Types.ObjectId;
  filename: string;
  contentType: string;
  data: Buffer;
  uploadedAt: Date;
}

export interface ITask extends Document {
  title: string;
  description?: string;
  project: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId | null;
  status: TaskStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  images: ITaskImage[];
}

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    status: {
      type: String,
      enum: ['todo', 'in_progress', 'code_review', 'completed', 'done'],
      default: 'todo',
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    images: [
      {
        filename: { type: String, required: true },
        contentType: { type: String, required: true },
        data: { type: Buffer, required: true, select: false },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model<ITask>('Task', TaskSchema);
export default Task;
