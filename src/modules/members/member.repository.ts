import { db } from "../../config/db";
import type { Member } from "../../types/database.types";
import { CreateMemberDTO } from "./member.model";

export const MemberRepository = {
  async findAll(): Promise<Member[]> {
    const result = await db<Member[]>`
      SELECT * FROM members
      ORDER BY name ASC
    `;
    return result;
  },

  async findById(id: string): Promise<Member | null> {
    const result = await db<Member[]>`
      SELECT * FROM members
      WHERE id = ${id}
    `;
    return result[0] || null;
  },

  async create(member: CreateMemberDTO): Promise<void> {
    await db`
      INSERT INTO members (id, name, study_program, semester)
      VALUES (${member.id}, ${member.name}, ${member.study_program}, ${member.semester})
    `;
  },

  async update(id: string, data: Partial<CreateMemberDTO>): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.id) {
      updates.push(`id = $${updates.length + 1}`);
      values.push(data.id);
    }
    if (data.name) {
      updates.push(`name = $${updates.length + 1}`);
      values.push(data.name);
    }
    if (data.study_program) {
      updates.push(`study_program = $${updates.length + 1}`);
      values.push(data.study_program);
    }
    if (data.semester !== undefined) {
      updates.push(`semester = $${updates.length + 1}`);
      values.push(data.semester);
    }

    if (updates.length > 0) {
      await db.unsafe(`
        UPDATE members 
        SET ${updates.join(", ")}
        WHERE id = $${updates.length + 1}
      `, [...values, id]);
    }
  },

  async delete(id: string): Promise<void> {
    await db`
      DELETE FROM members
      WHERE id = ${id}
    `;
  },
};
