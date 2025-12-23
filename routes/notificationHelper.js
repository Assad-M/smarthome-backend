// utils/notificationHelper.js
import db from "../db.js";

/**
 * Create a notification for a user
 * @param {number} userId - ID of the user who will receive the notification
 * @param {string} message - Message text
 * @param {string} type - Optional type for the notification
 */
export async function createNotification(userId, message, type = null) {
  try {
    await db.query(
      'INSERT INTO notifications (user_id, message, type, read_status, created_at) VALUES ($1, $2, $3, FALSE, NOW())',
      [userId, message, type]
    );
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}
