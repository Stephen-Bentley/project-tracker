import { User } from './index';

export interface Project {
  _id: string;
  name: string;
  description?: string;
  members: User[];
}
