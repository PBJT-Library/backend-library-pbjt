import prisma from "../../database/client";
import type { Member } from "../../generated/client";
import { CreateMemberDTO } from "./member.model";

export const MemberRepository = {
  async findAll(): Promise<Member[]> {
    return await prisma.member.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string): Promise<Member | null> {
    return await prisma.member.findUnique({
      where: { id },
    });
  },

  async create(member: CreateMemberDTO): Promise<void> {
    await prisma.member.create({
      data: {
        id: member.id,
        name: member.name,
        study_program: member.study_program,
        semester: member.semester,
      },
    });
  },

  async update(id: string, data: Partial<CreateMemberDTO>): Promise<void> {
    await prisma.member.update({
      where: { id },
      data: {
        ...(data.id && { id: data.id }),
        ...(data.name && { name: data.name }),
        ...(data.study_program && { study_program: data.study_program }),
        ...(data.semester !== undefined && { semester: data.semester }),
      },
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.member.delete({
      where: { id },
    });
  },
};
