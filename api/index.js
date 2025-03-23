import sgMail from "@sendgrid/mail";
import admin from "firebase-admin";
import functions from "firebase-functions";

// Initialize Firebase Admin
admin.initializeApp();

// Get SendGrid API key from Firebase Functions config
const SENDGRID_API_KEY = functions.config().sendgrid?.key;
sgMail.setApiKey(SENDGRID_API_KEY || "");

/**
 * Cloud function that runs daily to send habit reminders
 */
export const sendDailyHabitReminders = functions.pubsub
  .schedule("0 7 * * *") // Run at 7:00 AM UTC daily
  .timeZone("UTC")
  .onRun(async () => {
    try {
      functions.logger.info("Starting daily habit reminder job");

      const usersSnapshot = await admin.firestore().collection("users").get();
      if (usersSnapshot.empty) {
        functions.logger.info("No users found. Exiting.");
        return null;
      }

      const promises = usersSnapshot.docs.map(async userDoc => {
        const userId = userDoc.id;

        try {
          const userRecord = await admin.auth().getUser(userId);
          const userEmail = userRecord.email;
          if (!userEmail) {
            functions.logger.warn(`User ${userId} has no email.`);
            return;
          }

          const habitsSnapshot = await admin
            .firestore()
            .collection(`users/${userId}/habits`)
            .where("reminderEnabled", "==", true)
            .get();

          if (habitsSnapshot.empty) {
            functions.logger.info(`No habits with reminders for ${userId}`);
            return;
          }

          const today = new Date();
          const dayOfWeek = today.getDay(); // 0 = Sunday
          const dayOfMonth = today.getDate();

          const habitsToRemind = habitsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(habit => {
              const startDate = new Date(habit.startDate);
              if (today < startDate) return false;

              if (habit.frequency === "daily") return true;
              if (
                habit.frequency === "weekly" &&
                habit.weeklySchedule?.includes(dayOfWeek)
              )
                return true;
              if (
                habit.frequency === "monthly" &&
                dayOfMonth === new Date(habit.startDate).getDate()
              )
                return true;

              return false;
            });

          if (habitsToRemind.length === 0) {
            functions.logger.info(`No reminders due for ${userId}`);
            return;
          }

          const displayName = userRecord.displayName || "there";
          await sendReminderEmail(userEmail, displayName, habitsToRemind);
          functions.logger.info(`Reminder sent to ${userEmail}`);
        } catch (error) {
          functions.logger.error(`Error with user ${userId}:`, error);
        }
      });

      await Promise.all(promises);
      functions.logger.info("All reminders sent.");
    } catch (error) {
      functions.logger.error("Function error:", error);
    }

    return null;
  });

/**
 * Send reminder email
 */
async function sendReminderEmail(email, name, habits) {
  const habitsListHtml = habits
    .map(
      habit => `
      <li style="margin-bottom: 10px;">
        <div style="font-weight: bold;">${habit.name}</div>
        ${
          habit.description
            ? `<div style="color: #666;">${habit.description}</div>`
            : ""
        }
        <div style="font-size: 12px; color: #888;">
          ${habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)} 
          ${habit.reminderTime ? `at ${habit.reminderTime}` : ""}
        </div>
      </li>
    `,
    )
    .join("");

  const msg = {
    to: email,
    from: "habit-tracker@example.com",
    subject: "Daily Habit Reminders",
    text: `Hello ${name}! Here are your habit reminders for today.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Your Daily Habit Reminders</h2>
        <p>Hello ${name}!</p>
        <p>Here are your habits to complete today:</p>
        <ul style="padding-left: 20px;">
          ${habitsListHtml}
        </ul>
        <p>Keep up the good work building these habits! 💪</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>If you want to stop receiving these reminders, you can disable them in the habit settings.</p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    functions.logger.error("Failed to send email:", error);
    throw new Error("Email sending failed: " + error.message);
  }
}
