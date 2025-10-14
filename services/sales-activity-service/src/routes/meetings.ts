import express from 'express';
import * as meetingController from '../controllers/meetingController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Authentication is handled by API Gateway, no need for duplicate auth here
// router.use(authenticate);

router.post('/', meetingController.createMeeting);
router.get('/', meetingController.getMeetings);
router.get('/:id', meetingController.getMeeting);
router.put('/:id', meetingController.updateMeeting);
router.delete('/:id', meetingController.deleteMeeting);

export default router;
