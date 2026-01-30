import { Elysia, t } from "elysia";
import { LoanService } from "./loan.service";
import { authMiddleware } from "../../middleware/auth.middleware";

const CreateLoanBody = t.Object({
  member_uuid: t.String({
    minLength: 1,
    description: "Member UUID",
  }),
  book_id: t.Number({
    minimum: 1,
    description: "Book ID (internal database ID, not book_id display)",
  }),
  due_date: t.Optional(t.String({ format: "date" })),
  notes: t.Optional(t.String()),
});

const UpdateLoanBody = t.Object({
  due_date: t.Optional(t.String({ format: "date" })),
  status: t.Optional(
    t.Union([
      t.Literal("active"),
      t.Literal("completed"),
      t.Literal("overdue"),
    ]),
  ),
  notes: t.Optional(t.String()),
  book_id: t.Optional(
    t.Number({ minimum: 1, description: "Book ID to change to" }),
  ),
});

const ReturnLoanBody = t.Object({
  return_condition: t.Optional(t.String()),
  notes: t.Optional(t.String()),
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

  // GET /loans/:loan_id - Public
  .get(
    "/:loan_id",
    async ({ params }) => {
      const loan = await LoanService.getLoanByLoanId(params.loan_id);
      return Response.json(loan);
    },
    {
      detail: {
        tags: ["Loans"],
        summary: "Get Loan By loan_id",
        description:
          "Mengambil detail data peminjaman berdasarkan loan_id (e.g., LN001)",
      },
    },
  )

  // POST /loans - Public (for development)
  .post(
    "/",
    async ({ body }) => {
      console.log(
        "[DEBUG] POST /loans called with body:",
        JSON.stringify(body, null, 2),
      );
      // Convert date string to Date object
      const loanData = {
        ...body,
        due_date: body.due_date ? new Date(body.due_date) : new Date(),
      };
      const loan = await LoanService.borrowBook(loanData);
      console.log("[DEBUG] Loan created successfully:", loan);
      return loan;
    },
    {
      body: CreateLoanBody,
      response: t.Object({
        message: t.String(),
        loan_id: t.String(),
      }),
      detail: {
        tags: ["Loans"],
        summary: "Create New Loan",
        description:
          "Membuat data peminjaman buku baru (1 buku per loan, max 3 loans per member)",
      },
    },
  )

  // PUT /loans/:loan_id - Public (for development)
  .put(
    "/:loan_id",
    async ({ params, body }) => {
      console.log(
        "[DEBUG] PUT /loans/:loan_id called with:",
        JSON.stringify(body, null, 2),
      );
      // Convert date string to Date object if provided
      const updateData = {
        ...body,
        due_date: body.due_date ? new Date(body.due_date) : undefined,
      };
      const result = await LoanService.updateLoan(params.loan_id, updateData);
      console.log("[DEBUG] Loan updated successfully");
      return result;
    },
    {
      params: t.Object({
        loan_id: t.String({ minLength: 1 }),
      }),
      body: UpdateLoanBody,
      response: t.Object({
        message: t.String(),
      }),
      detail: {
        tags: ["Loans"],
        summary: "Update Loan",
        description: "Update loan due date, status, or notes",
      },
    },
  )

  // PATCH /loans/:loan_id/return - Public (for development)
  .patch(
    "/:loan_id/return",
    async ({ params, body }) => {
      console.log(
        "[DEBUG] PATCH /loans/:loan_id/return called for:",
        params.loan_id,
      );
      const loan = await LoanService.returnBook(
        params.loan_id,
        body || undefined,
      );
      console.log("[DEBUG] Book returned successfully");
      return loan;
    },
    {
      params: t.Object({
        loan_id: t.String({ minLength: 1 }),
      }),
      body: t.Optional(ReturnLoanBody),
      response: t.Object({
        message: t.String(),
      }),
      detail: {
        tags: ["Loans"],
        summary: "Return Book",
        description: "Return the book in a loan",
      },
    },
  )

  // DELETE /loans/:loan_id - Public (for development)
  .delete(
    "/:loan_id",
    async ({ params }) => {
      console.log("[DEBUG] DELETE /loans/:loan_id called for:", params.loan_id);
      const loan = await LoanService.deleteLoan(params.loan_id);
      console.log("[DEBUG] Loan deleted successfully");
      return loan;
    },
    {
      params: t.Object({
        loan_id: t.String({ minLength: 1 }),
      }),
      response: t.Object({
        message: t.String(),
      }),
      detail: {
        tags: ["Loans"],
        summary: "Delete Loan",
        description: "Menghapus data peminjaman dan mengembalikan status buku",
      },
    },
  )

  // Require authentication for other mutations
  .derive(authMiddleware)

  // POST /loans/bulk-return - Protected
  .post(
    "/bulk-return",
    async ({ body }) => {
      const result = await LoanService.bulkReturnBooks(body.loanIds);
      return result;
    },
    {
      body: t.Object({
        loanIds: t.Array(t.String({ minLength: 1 })),
      }),
      response: t.Object({
        message: t.String(),
        successCount: t.Number(),
        totalRequested: t.Number(),
        errors: t.Optional(t.Array(t.String())),
      }),
      detail: {
        tags: ["Loans"],
        summary: "Bulk Return Books (Protected)",
        description:
          "Return multiple books at once by providing array of loan IDs - requires admin auth",
        security: [{ Bearer: [] }],
      },
    },
  );
