import prisma from '../config/database';

export const handleCustomerDeleted = async (event: any) => {
  const { customerId } = event.data;
  console.log(`🗑️ Handling customer deletion: ${customerId}`);

  // Cancel pending approvals for deleted customer
  const result = await prisma.approvalRequest.updateMany({
    where: {
      customerId,
      status: 'PENDING',
    },
    data: {
      status: 'RECALLED',
      comment: 'Customer deleted',
    },
  });

  console.log(`✅ Cancelled ${result.count} pending approvals for customer ${customerId}`);
};

export const handleUserDeleted = async (event: any) => {
  const { userId } = event.data;
  console.log(`🗑️ Handling user deletion: ${userId}`);

  // Cancel approvals requested by deleted user
  const requestResult = await prisma.approvalRequest.updateMany({
    where: {
      requesterId: userId,
      status: 'PENDING',
    },
    data: {
      status: 'RECALLED',
      comment: 'Requester deleted',
    },
  });

  console.log(`✅ Cancelled ${requestResult.count} approvals requested by user ${userId}`);
};
