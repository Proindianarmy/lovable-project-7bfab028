import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    if (/ECONNREFUSED/.test(err.message)) {
      console.error(
        "\n👉 No MongoDB server reachable. If using local Mongo, start it first:\n" +
        "   - macOS (Homebrew): brew services start mongodb-community\n" +
        "   - Docker:           docker run -d -p 27017:27017 --name mongo mongo\n" +
        "   - Or set MONGODB_URI in backend/.env to a MongoDB Atlas connection string.\n",
      );
    } else if (/bad auth|Authentication failed/i.test(err.message)) {
      console.error(
        "\n👉 MongoDB Atlas rejected the credentials. Double-check the username/password " +
        "and that the placeholder <username>:<password> in MONGODB_URI was actually replaced.\n",
      );
    }
    process.exit(1);
  }
};

export default connectDB;
