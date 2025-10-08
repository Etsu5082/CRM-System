import prisma from '../config/database';

export const handleCustomerDeleted = async (event: any) => {
  const { customerId } = event.data;
  console.log(`🗑️ Handling customer deletion: ${customerId}`);

  // Delete related meetings
  const deletedMeetings = await prisma.meeting.deleteMany({
    where: { customerId },
  });

  // Delete related tasks
  const deletedTasks = await prisma.task.deleteMany({
    where: { customerId },
  });

  console.log(`✅ Deleted ${deletedMeetings.count} meetings and ${deletedTasks.count} tasks for customer ${customerId}`);
};

export const handleUserDeleted = async (event: any) => {
  const { userId } = event.data;
  console.log(`🗑️ Handling user deletion: ${userId}`);

  // Delete user's tasks
  const deletedTasks = await prisma.task.deleteMany({
    where: { userId },
  });

  // Delete user's meetings
  const deletedMeetings = await prisma.meeting.deleteMany({
    where: { salesId: userId },
  });

  console.log(`✅ Deleted ${deletedMeetings.count} meetings and ${deletedTasks.count} tasks for user ${userId}`);
};
