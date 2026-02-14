// lib/mongodb.ts
import { MongoClient } from "mongodb";

if (!process.env.DATABASE_URL) {
  throw new Error('Invalid/Missing environment variable: "DATABASE_URL"');
}

const uri = process.env.DATABASE_URL;
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // ในโหมด Dev เราจะใช้ Global Variable เก็บ Connection ไว้
  // เพื่อไม่ให้มันต่อใหม่ทุกครั้งที่เราแก้โค้ด (HMR)
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // โหมด Production สร้าง connection ปกติ
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
