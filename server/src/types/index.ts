import mongoose from 'mongoose';

export interface AuthUser {
  id: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export interface ObjectIdLike {
  id: string;
}

export const toObjectId = (id: string): mongoose.Types.ObjectId => new mongoose.Types.ObjectId(id);