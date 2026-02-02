import { Elysia, t } from 'elysia';
import { MemberService } from './member.service';
import { CreateMemberDTO } from './member.model';
import { authMiddleware } from '../../middleware/auth.middleware';

export const memberRoute = new Elysia({ prefix: '/members' })
  // GET /members - Public
  .get(
    '/',
    async () => {
      const members = await MemberService.getAllMembers();
      return Response.json(members);
    },
    {
      detail: {
        tags: ['Member'],
        summary: 'Get All Members',
        description: 'Mengambil semua data member yang tersedia di sistem',
      },
    }
  )

  // GET /members/search?q=query - Public
  .get(
    '/search',
    async ({ query }) => {
      console.log('[DEBUG] GET /members/search called with query:', query.q);
      const members = await MemberService.searchMembers(query.q || '');
      console.log(`[DEBUG] Found ${members.length} members`);
      return Response.json(members);
    },
    {
      query: t.Object({
        q: t.String(),
      }),
      detail: {
        tags: ['Member'],
        summary: 'Search Members',
        description: 'Mencari member berdasarkan nama atau member_id',
      },
    }
  )

  // GET /members/:id - Public
  .get(
    '/:id',
    async ({ params }) => {
      const member = await MemberService.getMemberById(params.id);
      return Response.json(member);
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1 }),
      }),
      detail: {
        tags: ['Member'],
        summary: 'Get Member by ID',
        description: 'Mengambil detail member berdasarkan ID',
      },
    }
  )

  // POST /members - Public (for development)
  .post(
    '/',
    async ({ body }) => {
      console.log('[DEBUG] POST /members called with:', body);
      // Map frontend 'id' field to backend 'member_id' field
      const memberData: CreateMemberDTO = {
        member_id: body.id,
        name: body.name,
        study_program: body.study_program,
        semester: body.semester,
      };
      const result = await MemberService.addMember(memberData);
      console.log('[DEBUG] Member created successfully');
      return result;
    },
    {
      body: t.Object({
        id: t.String(),
        name: t.String(),
        study_program: t.String(),
        semester: t.Number({ minimum: 1, maximum: 14 }),
      }),
      detail: {
        tags: ['Member'],
        summary: 'Register New Member',
        description: 'Menambahkan data member baru ke dalam sistem',
      },
    }
  )

  // PUT /members/:id - Public (for development)
  .put(
    '/:id',
    async ({ params, body }) => {
      console.log('[DEBUG] PUT /members/:id called with:', {
        id: params.id,
        body,
      });

      // Map frontend 'id' (NIM) to backend 'member_id'
      const updateData: Partial<CreateMemberDTO> = {
        member_id: body.id, // Ensure this is passed
        name: body.name,
        study_program: body.study_program,
        semester: body.semester,
      };

      const result = await MemberService.updateMember(params.id as string, updateData);
      console.log('[DEBUG] Member updated successfully');
      return Response.json(result);
    },
    {
      body: t.Object({
        id: t.Optional(t.String()),
        name: t.Optional(t.String()),
        study_program: t.Optional(t.String()),
        semester: t.Optional(t.Number({ minimum: 1, maximum: 14 })),
      }),
      detail: {
        tags: ['Member'],
        summary: 'Update Member',
        description: 'Memperbarui data member berdasarkan ID',
      },
    }
  )

  // DELETE /members/:id - Public (for development)
  .delete(
    '/:id',
    async ({ params }) => {
      console.log('[DEBUG] DELETE /members/:id called for:', params.id);
      const result = await MemberService.deleteMember(params.id as string);
      console.log('[DEBUG] Member deleted successfully');
      return Response.json(result);
    },
    {
      detail: {
        tags: ['Member'],
        summary: 'Delete Member',
        description: 'Menghapus data member berdasarkan ID',
      },
    }
  )

  // Require authentication for mutations (future use)
  .derive(authMiddleware);
