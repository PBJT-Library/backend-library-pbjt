import { db } from "../../config/db";
import type {
  Member,
  CreateMemberDTO,
  UpdateMemberDTO,
  MemberWithActiveLoans,
} from "../../types/database.types";

export const MemberRepository = {
  /**
   * Get all members with UUID
   */
  async findAll(): Promise<Member[]> {
    const result = await db`
      SELECT 
        id, uuid, member_id, name, study_program, semester, join_date, is_active,
        created_at, updated_at
      FROM public.members
      ORDER BY name ASC
    `;
    return result as unknown as Member[];
  },

  /**
   * Get member by member_id (display ID like 23190001)
   */
  async findByMemberId(member_id: string): Promise<Member | null> {
    const result = await db`
      SELECT 
        id, uuid, member_id, name, study_program, semester, join_date, is_active,
        created_at, updated_at
      FROM public.members
      WHERE member_id = ${member_id}
    `;
    return (result[0] as Member) || null;
  },

  /**
   * Get member by UUID
   */
  async findByUuid(uuid: string): Promise<Member | null> {
    const result = await db`
      SELECT 
        id, uuid, member_id, name, study_program, semester, join_date, is_active,
        created_at, updated_at
      FROM public.members
      WHERE uuid = ${uuid}
    `;
    return (result[0] as Member) || null;
  },

  /**
   * Create a new member
   */
  async create(member: CreateMemberDTO): Promise<string> {
    const result = await db`
      INSERT INTO public.members (
        member_id, name, study_program, semester
      ) VALUES (
        ${member.member_id},
        ${member.name},
        ${member.study_program || null},
        ${member.semester}
      )
      RETURNING uuid
    `;
    return result[0].uuid;
  },

  /**
   * Update member information
   */
  async update(member_id: string, data: UpdateMemberDTO): Promise<void> {
    const updates: any = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.study_program !== undefined)
      updates.study_program = data.study_program;
    if (data.semester !== undefined) updates.semester = data.semester;
    if (data.is_active !== undefined) updates.is_active = data.is_active;

    if (Object.keys(updates).length === 0) return;

    await db`
      UPDATE public.members
      SET ${db(updates)}
      WHERE member_id = ${member_id}
    `;
  },

  /**
   * Delete a member (only if no active loans)
   */
  async delete(member_id: string): Promise<void> {
    // Check for active loans
    const member = await this.findByMemberId(member_id);
    if (!member) {
      throw new Error("Member tidak ditemukan");
    }

    const activeLoans = await db`
      SELECT COUNT(*) as count
      FROM public.loans
      WHERE member_uuid = ${member.uuid} AND status = 'active'
    `;

    if (parseInt(activeLoans[0].count) > 0) {
      throw new Error(
        "Tidak dapat menghapus member yang masih memiliki pinjaman aktif",
      );
    }

    await db`
      DELETE FROM public.members
      WHERE member_id = ${member_id}
    `;
  },

  /**
   * Get members with active loans count
   */
  async findAllWithActiveLoans(): Promise<MemberWithActiveLoans[]> {
    const result = await db`
      SELECT 
        m.id,
        m.uuid,
        m.member_id,
        m.name,
        m.study_program,
        m.semester,
        m.join_date,
        m.is_active,
        m.created_at,
        m.updated_at,
        COUNT(CASE WHEN l.status = 'active' THEN 1 END) as active_loans_count
      FROM public.members m
      LEFT JOIN public.loans l ON m.uuid = l.member_uuid
      GROUP BY m.id, m.uuid, m.member_id, m.name, m.study_program, m.semester, m.join_date, m.is_active,
               m.created_at, m.updated_at
      ORDER BY m.name ASC
    `;

    return result.map((row: any) => ({
      ...row,
      active_loans_count: parseInt(row.active_loans_count),
    }));
  },

  /**
   * Search members by name or member_id
   */
  async search(query: string): Promise<Member[]> {
    const result = await db`
      SELECT 
        id, uuid, member_id, name, study_program, join_date, is_active,
        created_at, updated_at
      FROM public.members
      WHERE 
        name ILIKE ${"%" + query + "%"} OR
        member_id ILIKE ${"%" + query + "%"}
      ORDER BY name ASC
    `;
    return result as unknown as Member[];
  },
};
