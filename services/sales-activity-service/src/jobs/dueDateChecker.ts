import cron from 'node-cron';
import prisma from '../config/database';
import { publishEvent } from '../config/kafka';
import { v4 as uuidv4 } from 'uuid';

// Check for tasks due within 24 hours every hour
export const startDueDateChecker = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('🔍 Checking for tasks due soon...');

    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    const tasks = await prisma.task.findMany({
      where: {
        dueDate: {
          lte: tomorrow,
          gte: new Date(),
        },
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
      },
    });

    console.log(`Found ${tasks.length} tasks due within 24 hours`);

    for (const task of tasks) {
      await publishEvent('sales.events', {
        eventId: uuidv4(),
        eventType: 'task.due_soon',
        timestamp: new Date().toISOString(),
        data: {
          taskId: task.id,
          userId: task.userId,
          customerId: task.customerId,
          title: task.title,
          dueDate: task.dueDate,
          priority: task.priority,
        },
      });
    }
  });

  console.log('✅ Due date checker started');
};
