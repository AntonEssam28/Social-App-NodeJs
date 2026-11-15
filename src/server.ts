import {createApp} from './app';
import http from 'http';
import mongoose from 'mongoose';
import { connectToDatabase } from './lib/db/connection';
import { env } from './lib/config/env';

const app = createApp();
const server = http.createServer(app);

async function startServer() {
    await connectToDatabase();
    server.listen(env.PORT, () => {
        console.log(`Server is running on port ${env.PORT}`);
    });
}

async function shutdown() {
    await mongoose.disconnect();
    server.close();
    process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void startServer().catch((error: unknown) => {
    console.error('Failed to start server:', error);
    process.exitCode = 1;
});