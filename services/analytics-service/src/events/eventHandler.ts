import prisma from '../config/database';
import { cacheDel, cacheDelPattern } from '../config/redis';

export const handleApprovalRequested = async (event: any) => {
  const { approvalId, requesterId } = event.data;

  // Create notification for managers
  await prisma.notification.create({
    data: {
      userId: requesterId, // Placeholder - should notify managers
      type: 'APPROVAL_REQUEST',
      title: '新しい承認申請',
      message: `承認申請 ${approvalId} が作成されました`,
      link: `/approvals/${approvalId}`,
    },
  });

  // Invalidate cache
  await cacheDel('report:approval-stats');
};

export const handleApprovalApproved = async (event: any) => {
  const { approvalId, requesterId, approverId } = event.data;

  // Notify requester
  await prisma.notification.create({
    data: {
      userId: requesterId,
      type: 'APPROVAL_APPROVED',
      title: '承認申請が承認されました',
      message: `承認申請 ${approvalId} が承認されました`,
      link: `/approvals/${approvalId}`,
    },
  });

  await cacheDel('report:approval-stats');
};

export const handleApprovalRejected = async (event: any) => {
  const { approvalId, requesterId } = event.data;

  // Notify requester
  await prisma.notification.create({
    data: {
      userId: requesterId,
      type: 'APPROVAL_REJECTED',
      title: '承認申請が却下されました',
      message: `承認申請 ${approvalId} が却下されました`,
      link: `/approvals/${approvalId}`,
    },
  });

  await cacheDel('report:approval-stats');
};

export const handleTaskDueSoon = async (event: any) => {
  const { taskId, userId, title, dueDate } = event.data;

  // Create notification
  await prisma.notification.create({
    data: {
      userId,
      type: 'TASK_DUE_SOON',
      title: 'タスク期限が近づいています',
      message: `タスク「${title}」の期限が ${new Date(dueDate).toLocaleDateString('ja-JP')} に迫っています`,
      link: `/tasks/${taskId}`,
    },
  });
};

export const handleTaskCompleted = async (event: any) => {
  await cacheDel('report:task-completion');
};

export const handleCustomerCreated = async (event: any) => {
  await cacheDel('report:customer-stats');
  await cacheDel('report:sales-summary');
};

export const handleMeetingCreated = async (event: any) => {
  await cacheDel('report:sales-summary');
};
