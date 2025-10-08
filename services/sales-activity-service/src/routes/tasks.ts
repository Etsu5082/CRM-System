import express from 'express';
import * as taskController from '../controllers/taskController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/overdue', taskController.getOverdueTasks);
router.get('/:id', taskController.getTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

export default router;
