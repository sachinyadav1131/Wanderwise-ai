import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGO_URI, {
            dbName: "Wanderwise-ai",
            serverSelectionTimeoutMS: 10000,
        });

        console.log(`Database connected successfully: ${connection.connection.host}`);
    } catch (error) {
        console.error(`Database connection failed: ${error.message}`);
        process.exit(1);
    }
};
