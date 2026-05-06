import cron from 'node-cron';
import ShareLink from '../models/ShareLink.model.js';

/**
 * Starts the background cron job to manage share links
 */
export const startCronJobs = () => {
  // Run at the top of every hour
  cron.schedule('0 * * * *', async () => {
    console.log('🕒 Running ShareLink cleanup job...');
    try {
      const now = new Date();
      
      const result = await ShareLink.updateMany(
        { 
          expiresAt: { $lt: now },
          isRevoked: false 
        },
        { 
          $set: { isRevoked: true } 
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Revoked ${result.modifiedCount} expired share links.`);
      } else {
        console.log('✅ No expired share links to revoke.');
      }
    } catch (error) {
      console.error('❌ Error running ShareLink cleanup job:', error);
    }
  });

  console.log('⏳ Cron jobs initialized.');
};
