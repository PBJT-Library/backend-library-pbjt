import { Elysia, t } from "elysia";
import { LoanService } from "./loan.service";
import { CreateLoanDTO } from "./loan.model";
import { authMiddleware } from "../../middleware/auth.middleware";

const CreateLoanBody = t.Object({
  id: t.String({
    // ✅ member ID (student ID like "23190001")
    minLength: 1,
  }),
  catalog_id: t.String({
    // ✅ catalog ID to find available inventory
    minLength: 1,
  }),
  loan_date: t.Optional(t.String({ format: "date" })),
});

const UpdateLoanBody = t.Object({
  book_id: t.Optional(
    t.String({
      minLength: 1,
    }),
  ),
  member_id: t.Optional(
    t.String({
      minLength: 1,
    }),
  ),
  quantity: t.Optional(t.Number({ minimum: 1 })),
  loan_date: t.Optional(t.String({ format: "date" })),
});

export const loanRoute = new Elysia({ prefix: "/loans" })
  // GET /loans - Public
  .get(
    "/",
    async () => {
      const loans = await LoanService.getAllLoans();
      return Response.json(loans);
    },
    {
      detail: {
        tags: ["Loans"],
        summary: "Get All Loans",
        description:
          "Mengambil seluruh data peminjaman buku beserta informasi buku dan member",
      },
    },
  )

  // GET /loans/:id - Public
  .get(
    "/:id",
    async ({ params }) => {
      const loan = await LoanService.getLoanById(params.id);
      return Response.json(loan);
    },
    {
      detail: {
        tags: ["Loans"],
        summary: "Get Loan By ID",
        description: "Mengambil detail data peminjaman berdasarkan ID",
      },
    },
  )

  // Require authentication for mutations
  .derive(authMiddleware)

  // POST /loans - Protected
  .post(
    "/",
    async ({ body }) => {
      const loan = await LoanService.borrowBook(body as CreateLoanDTO);
      return loan;
    },
    {
      body: CreateLoanBody,
      response: t.Object({
        message: t.String(),
        loan_id: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Loans"],
        summary: "Create New Loan (Protected)",
        description:
          "Membuat data peminjaman buku baru dan mengurangi stok buku - requires admin auth",
        security: [{ Bearer: [] }],
      },
    },
  )

  // PATCH /loans/:id/return - Protected
  .patch(
    "/:id/return",
    async ({ params }) => {
      const loan = await LoanService.returnBook(params.id);
      return loan;
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1 }),
      }),
      response: t.Object({
        message: t.String(),
      }),
      detail: {
        tags: ["Loans"],
        summary: "Return Book (Protected)",
        description:
          "Mengembalikan buku, mengisi tanggal pengembalian, dan menambah stok - requires admin auth",
        security: [{ Bearer: [] }],
      },
    },
  )

  // PUT /loans/:id - Protected
  .put(
    "/:id",
    async ({ params, body }) => {
      return await LoanService.updateLoanBody(params.id, body);
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1 }),
      }),
      body: UpdateLoanBody,
      response: t.Object({
        message: t.String(),
      }),
      detail: {
        tags: ["Loans"],
        summary: "Update Loan (Protected)",
        description:
          "Memperbarui data peminjaman yang masih aktif - requires admin auth",
        security: [{ Bearer: [] }],
      },
    },
  )

  // DELETE /loans/:id - Protected
  .delete(
    "/:id",
    async ({ params }) => {
      const loan = await LoanService.deleteLoan(params.id);
      return loan;
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1 }),
      }),
      response: t.Object({
        message: t.String(),
      }),
      detail: {
        tags: ["Loans"],
        summary: "Delete Loan (Protected)",
        description:
          "Menghapus data peminjaman dan mengembalikan stok jika buku belum dikembalikan - requires admin auth",
        security: [{ Bearer: [] }],
      },
    },
  );
