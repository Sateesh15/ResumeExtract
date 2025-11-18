import {
  type Candidate,
  type InsertCandidate,
  type ExtractionJob,
  type InsertExtractionJob,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Candidate operations
  getCandidates(): Promise<Candidate[]>;
  getCandidate(id: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: string, candidate: Partial<Candidate>): Promise<Candidate | undefined>;
  deleteCandidate(id: string): Promise<boolean>;
  deleteAllCandidates(): Promise<number>;
  flagCandidate(id: string): Promise<Candidate | undefined>;

  // Extraction job operations
  getJobs(): Promise<ExtractionJob[]>;
  getJob(id: string): Promise<ExtractionJob | undefined>;
  createJob(job: InsertExtractionJob): Promise<ExtractionJob>;
  updateJob(id: string, job: Partial<ExtractionJob>): Promise<ExtractionJob | undefined>;
}

export class MemStorage implements IStorage {
  private candidates: Map<string, Candidate>;
  private jobs: Map<string, ExtractionJob>;

  constructor() {
    this.candidates = new Map();
    this.jobs = new Map();
  }

  // Candidate operations
  async getCandidates(): Promise<Candidate[]> {
    return Array.from(this.candidates.values()).sort(
      (a, b) => new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime()
    );
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    return this.candidates.get(id);
  }

  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    const id = randomUUID();
    const candidate: Candidate = {
      ...insertCandidate,
      id,
      extractedAt: new Date().toISOString(),
    };
    this.candidates.set(id, candidate);
    return candidate;
  }

  async updateCandidate(
    id: string,
    updates: Partial<Candidate>
  ): Promise<Candidate | undefined> {
    const candidate = this.candidates.get(id);
    if (!candidate) return undefined;

    const updated = { ...candidate, ...updates };
    this.candidates.set(id, updated);
    return updated;
  }

  async deleteCandidate(id: string): Promise<boolean> {
    return this.candidates.delete(id);
  }
  
  async deleteAllCandidates(): Promise<number> {
    const count = this.candidates.size;
    this.candidates.clear();
    return count;
  }


  async flagCandidate(id: string): Promise<Candidate | undefined> {
    const candidate = this.candidates.get(id);
    if (!candidate) return undefined;

    const updated = { ...candidate, flagged: true };
    this.candidates.set(id, updated);
    return updated;
  }

  // Extraction job operations
  async getJobs(): Promise<ExtractionJob[]> {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  async getJob(id: string): Promise<ExtractionJob | undefined> {
    return this.jobs.get(id);
  }

  async createJob(insertJob: InsertExtractionJob): Promise<ExtractionJob> {
    const id = randomUUID();
    const job: ExtractionJob = {
      ...insertJob,
      id,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(
    id: string,
    updates: Partial<ExtractionJob>
  ): Promise<ExtractionJob | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    const updated = { ...job, ...updates };
    this.jobs.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
