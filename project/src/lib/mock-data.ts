// All runtime data is now served from the API layer.
// This file contains shared TypeScript types only.

export type IssueStatus = "Pending" | "Assigned" | "In Progress" | "Resolved";
export type IssueSeverity = "Low" | "Medium" | "High";

export interface Issue {
  _id: string;
  title: string;
  category: string;
  status: IssueStatus;
  severity: IssueSeverity;
  reporter: { name: string; avatar?: string };
  createdAt: string;
  supporters: string[];
  images: string[];
  description: string;
  location: { address: string; coordinates: { lat: number; lng: number } };
}
