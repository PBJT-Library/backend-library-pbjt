import { Elysia, t } from "elysia";
import { MemberService } from "./member.service";
import { CreateMemberDTO } from "./member.model";
import { authMiddleware } from "../../middleware/auth.middleware";

export const memberRoute = new Elysia({ prefix: "/members" })
  // GET /members - Public
  .get(
    "/",
    async () => {
      const members = await MemberService.getAllMembers();
      return Response.json(members);
    },
    {
      detail: {
        tags: ["Member"],
        summary: "Get All Members",
        description: "Mengambil semua data member yang tersedia di sistem",
      },
    },
  )

  // GET /members/:id - Public
  .get(
    "/:id",
    async ({ params }) => {
      const member = await MemberService.getMemberById(params.id);
      return Response.json(member);
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1 }),
      }),
      detail: {
        tags: ["Member"],
        summary: "Get Member by ID",
        description: "Mengambil detail member berdasarkan ID",
      },
    },
  )

  // Require authentication for mutations
  .derive(authMiddleware)

  // POST /members - Protected
  .post(
    "/",
    async ({ body }) => {
      return await MemberService.addMember(body as CreateMemberDTO);
    },
    {
      body: t.Object({
        id: t.String(),
        name: t.String(),
        study_program: t.String(),
        semester: t.Number({ minimum: 1, maximum: 14 }),
      }),
      detail: {
        tags: ["Member"],
        summary: "Register New Member (Protected)",
        description:
          "Menambahkan data member baru ke dalam sistem - requires admin auth",
        security: [{ Bearer: [] }],
      },
    },
  )

  // PUT /members/:id - Protected
  .put(
    "/:id",
    async ({ params, body }) => {
      return Response.json(
        await MemberService.updateMember(
          params.id as string,
          body as Partial<CreateMemberDTO>,
        ),
      );
    },
    {
      body: t.Object({
        id: t.Optional(t.String()),
        name: t.Optional(t.String()),
        study_program: t.Optional(t.String()),
        semester: t.Optional(t.Number({ minimum: 1, maximum: 14 })),
      }),
      detail: {
        tags: ["Member"],
        summary: "Update Member (Protected)",
        description:
          "Memperbarui data member berdasarkan ID - requires admin auth",
        security: [{ Bearer: [] }],
      },
    },
  )

  // DELETE /members/:id - Protected
  .delete(
    "/:id",
    async ({ params }) => {
      return Response.json(
        await MemberService.deleteMember(params.id as string),
      );
    },
    {
      detail: {
        tags: ["Member"],
        summary: "Delete Member (Protected)",
        description:
          "Menghapus data member berdasarkan ID - requires admin auth",
        security: [{ Bearer: [] }],
      },
    },
  );
