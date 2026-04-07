export interface DiaryEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntryInput {
  date: string; // YYYY-MM-DD
  text: string;
  userId?: string; // defaults to 'default'
}
