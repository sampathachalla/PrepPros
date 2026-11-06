import type { Request, Response } from 'express';
import { getUserId } from '../../middleware/auth.js';
import {
  addMemberSchema,
  createHouseholdSchema,
  joinHouseholdSchema,
  memberParamsSchema,
  updateHouseholdSchema,
} from './schema.js';
import * as service from './service.js';

export async function get(req: Request, res: Response) {
  res.json(await service.getHousehold(getUserId(req)));
}

export async function create(req: Request, res: Response) {
  const { name } = createHouseholdSchema.parse(req.body);
  res.status(201).json(await service.createHousehold(getUserId(req), name));
}

export async function join(req: Request, res: Response) {
  const { code } = joinHouseholdSchema.parse(req.body);
  res.json(await service.joinHousehold(getUserId(req), code));
}

export async function update(req: Request, res: Response) {
  const { name } = updateHouseholdSchema.parse(req.body);
  res.json(await service.renameHousehold(getUserId(req), name));
}

export async function resetInvite(req: Request, res: Response) {
  res.json(await service.resetInvite(getUserId(req)));
}

export async function leave(req: Request, res: Response) {
  await service.leaveHousehold(getUserId(req));
  res.status(204).end();
}

export async function addMember(req: Request, res: Response) {
  const { email } = addMemberSchema.parse(req.body);
  res.status(201).json(await service.addMemberByEmail(getUserId(req), email));
}

export async function removeMember(req: Request, res: Response) {
  const { userId } = memberParamsSchema.parse(req.params);
  res.json(await service.removeMember(getUserId(req), userId));
}

export async function makeAdmin(req: Request, res: Response) {
  const { userId } = memberParamsSchema.parse(req.params);
  res.json(await service.makeAdmin(getUserId(req), userId));
}
