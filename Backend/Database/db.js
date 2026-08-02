import mongoose from "mongoose";
import dns from "dns";

const setPublicDnsServers = () => {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  console.warn("Switched DNS lookups to public resolvers 8.8.8.8 and 1.1.1.1.");
};

const attemptSrvLookup = async (uri) => {
  const srvMatch = uri.match(/^mongodb\+srv:\/\/[^@]+@([^/]+)(?:\/|$)/);
  if (!srvMatch) return;

  const srvHost = srvMatch[1];
  try {
    await dns.promises.resolveSrv(`_mongodb._tcp.${srvHost}`);
  } catch (error) {
    console.warn("Atlas SRV DNS lookup failed in Node; retrying with public DNS servers.", error.message);
    setPublicDnsServers();
  }
};

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI must be defined in environment variables.");
    }

    if (mongoUri.startsWith("mongodb+srv://")) {
      await attemptSrvLookup(mongoUri);
    }

    const connection = await mongoose.connect(mongoUri, {
      dbName: "Wanderwise-ai",
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`Database connected successfully: ${connection.connection.host}`);
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  }
};
