import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pool configuration
// These settings help prevent connection exhaustion and handle long-running queries
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  
  // Test database connection on startup
  prisma.$connect()
    .then(() => {
      console.log("✅ Database connected successfully");
    })
    .catch((error) => {
      console.error("❌ Database connection failed:", error.message);
      console.error("Please check your DATABASE_URL environment variable in .env file");
    });
}

/**
 * Check if a Prisma error is a connection error that can be retried
 */
function isConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  
  // Check for Prisma connection errors
  const errorString = JSON.stringify(error);
  return (
    errorString.includes("Closed") ||
    errorString.includes("connection") ||
    errorString.includes("ECONNREFUSED") ||
    errorString.includes("ETIMEDOUT") ||
    (error as any).code === "P1001" || // Prisma connection error code
    (error as any).code === "P1017"    // Prisma server closed connection
  );
}

/**
 * Retry a database operation with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If this is a retry, ensure connection is active
      if (attempt > 0) {
        try {
          await prisma.$queryRaw`SELECT 1`;
        } catch (connectError) {
          // If connection check fails, try to reconnect
          try {
            await prisma.$disconnect();
            await prisma.$connect();
          } catch (reconnectError) {
            // Ignore reconnect errors, will be caught in next attempt
          }
        }
        
        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Only retry on connection errors
      if (isConnectionError(error) && attempt < maxRetries) {
        console.warn(
          `Database connection error (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`,
          error instanceof Error ? error.message : String(error)
        );
        continue;
      }
      
      // If it's not a connection error or we've exhausted retries, throw
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Execute a database operation with automatic retry on connection errors
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>
): Promise<T> {
  return retryWithBackoff(operation);
}

// Handle process termination gracefully
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
  
  process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  
  process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

