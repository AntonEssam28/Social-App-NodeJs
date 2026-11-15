import mongoose from 'mongoose';
import { env } from '../config/env';

export async function connectToDatabase() {
    await mongoose.connect(env.db.url);
}