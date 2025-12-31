import { db } from "../../config/db";
import { Member, CreateMemberDTO } from "./member.model";

export const MemberRepository = {
  async findAll(): Promise<Member[]> {
    const members = await db<Member[]>`
      SELECT * FROM members
      ORDER BY name
    `;
    return members;
  },

  async findById(id: string) {
    const result = await db`
      SELECT * FROM members
      WHERE id = ${id}
    `;
    return result[0] ?? null;
  },

  async create(member: CreateMemberDTO): Promise<void> {
    await db`
      INSERT INTO members (
        id, name, study_program, semester
      ) VALUES (
        ${member.id},
        ${member.name},
        ${member.study_program},
        ${member.semester}
      )
    `;
  },

  async update(id: string, data: Partial<CreateMemberDTO>) {
    const new_id = data.id ?? id;
    await db`
      UPDATE members SET
        id = ${new_id},
        name = COALESCE(${data.name ?? null}, name),
        study_program = COALESCE(${data.study_program ?? null}, study_program),
        semester = COALESCE(${data.semester ?? null}, semester)
      WHERE id = ${id}
    `;
  },

  async delete(id: string) {
    await db`
      DELETE FROM members WHERE id = ${id}
    `;
  }
};
