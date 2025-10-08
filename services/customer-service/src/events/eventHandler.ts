import prisma from '../config/database';

export const handleUserDeleted = async (event: any) => {
  const { userId } = event.data;
  console.log(`🗑️ Handling user deletion: ${userId}`);

  // Soft delete customers assigned to this user
  const result = await prisma.customer.updateMany({
    where: {
      assignedSalesId: userId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  console.log(`✅ Soft deleted ${result.count} customers for user ${userId}`);
};
