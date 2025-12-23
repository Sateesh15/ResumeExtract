import {
  type Candidate,
  type InsertCandidate,
  type ExtractionJob,
  type InsertExtractionJob,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { MongoClient, Db, Collection } from "mongodb";

// ✅ MongoDB connection string (use environment variable)
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = "resume_extractor";

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

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private db: Db | null = null;
  private candidatesCollection: Collection<Candidate> | null = null;
  private jobsCollection: Collection<ExtractionJob> | null = null;

  constructor() {
    this.client = new MongoClient(MONGODB_URI);
  }

  // ✅ Initialize MongoDB connection
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(DB_NAME);
      this.candidatesCollection = this.db.collection<Candidate>("candidates");
      this.jobsCollection = this.db.collection<ExtractionJob>("jobs");

      // Create indexes for better performance
      await this.candidatesCollection.createIndex({ extractedAt: -1 });
      await this.candidatesCollection.createIndex({ fullName: "text", skills: "text" });
      await this.jobsCollection.createIndex({ startedAt: -1 });

      console.log("✅ MongoDB connected successfully");
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  // ✅ Close MongoDB connection
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log("✅ MongoDB disconnected");
    }
  }

  // Candidate operations
  async getCandidates(): Promise<Candidate[]> {
    if (!this.candidatesCollection) throw new Error("Database not connected");
    
    return this.candidatesCollection
      .find({})
      .sort({ extractedAt: -1 })
      .toArray();
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    if (!this.candidatesCollection) throw new Error("Database not connected");
    
    const candidate = await this.candidatesCollection.findOne({ id } as any);
    return candidate || undefined;
  }

  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    if (!this.candidatesCollection) throw new Error("Database not connected");

    const id = randomUUID();
    const candidate: Candidate = {
      ...insertCandidate,
      id,
      extractedAt: new Date().toISOString(),
    } as any;

    await this.candidatesCollection.insertOne(candidate);
    return candidate;
  }

  async updateCandidate(
    id: string,
    updates: Partial<Candidate>
  ): Promise<Candidate | undefined> {
    if (!this.candidatesCollection) throw new Error("Database not connected");

    const result = await this.candidatesCollection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: "after" }
    );

    return result  as Candidate | undefined;
  }

  async deleteCandidate(id: string): Promise<boolean> {
    if (!this.candidatesCollection) throw new Error("Database not connected");

    const result = await this.candidatesCollection.deleteOne({ id } as any);
    return result.deletedCount > 0;
  }

  async deleteAllCandidates(): Promise<number> {
    if (!this.candidatesCollection) throw new Error("Database not connected");

    const result = await this.candidatesCollection.deleteMany({});
    return result.deletedCount;
  }

  async flagCandidate(id: string): Promise<Candidate | undefined> {
    if (!this.candidatesCollection) throw new Error("Database not connected");

    const result = await this.candidatesCollection.findOneAndUpdate(
      { id },
      { $set: { flagged: true } },
      { returnDocument: "after" }
    );

   return result as Candidate | undefined;
  }

  // Extraction job operations
  async getJobs(): Promise<ExtractionJob[]> {
    if (!this.jobsCollection) throw new Error("Database not connected");

    return this.jobsCollection
      .find({})
      .sort({ startedAt: -1 })
      .toArray();
  }

  async getJob(id: string): Promise<ExtractionJob | undefined> {
    if (!this.jobsCollection) throw new Error("Database not connected");

    const job = await this.jobsCollection.findOne({ id } as any);
    return job || undefined;
  }

  async createJob(insertJob: InsertExtractionJob): Promise<ExtractionJob> {
    if (!this.jobsCollection) throw new Error("Database not connected");

    const id = randomUUID();
    const job: ExtractionJob = {
      ...insertJob,
      id,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    } as any;

    await this.jobsCollection.insertOne(job);
    return job;
  }

  async updateJob(
    id: string,
    updates: Partial<ExtractionJob>
  ): Promise<ExtractionJob | undefined> {
    if (!this.jobsCollection) throw new Error("Database not connected");

    const result = await this.jobsCollection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: "after" }
    );

    return result as ExtractionJob | undefined;
  }
}

// ✅ Create and export singleton instance
let storage: MongoStorage;

export async function initializeStorage(): Promise<MongoStorage> {
  storage = new MongoStorage();
  await storage.connect();
  return storage;
}

export { storage };
