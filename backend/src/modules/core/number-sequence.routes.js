import { Router } from 'express';
import { authenticate, authorize, requirePermission } from '../../middleware/authenticate.js';
import { branchScope } from '../../middleware/branchScope.js';
import { validate } from '../../middleware/validate.js';
import { reseedSequence, getNextNumber } from './number-sequence.service.js';
import { reseedSequenceSchema, nextNumberQuerySchema } from './core.validation.js';

const router = Router();

router.use(authenticate, branchScope);

router.post('/reseed', authorize('admin'), requirePermission('admin:manage_users'), validate(reseedSequenceSchema), async (req, res, next) => {
  try {
    const nextNumber = await reseedSequence(req.body.branch_id, req.body.type);
    res.json({ message: 'تمت إعادة تعيين التسلسل', next_number: nextNumber });
  } catch (err) { next(err); }
});

router.get('/next', requirePermission('admin:manage_permissions'), async (req, res, next) => {
  try {
    const { branch_id, type } = nextNumberQuerySchema.parse(req.query);
    const number = await getNextNumber(branch_id, type);
    res.json({ number });
  } catch (err) { next(err); }
});

export default router;
