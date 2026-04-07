export interface ContextNote {
  id: string;
  userId: string;
  text: string;
  orderIdx: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContextNoteInput {
  text: string;
  userId?: string;
  orderIdx?: number;
}
