import { Elysia, t } from "elysia";
import { BookService } from "./book.service";
import { authMiddleware } from "../../middleware/auth.middleware";

export const bookRoute = new Elysia({ prefix: "/books" })
  // GET /books - Public
  .get(
    "/",
    async () => {
      const books = await BookService.getAllBooks();
      return Response.json(books);
    },
    {
      detail: {
        tags: ["Book"],
        summary: "Get All Books",
        description: "Mengambil seluruh data buku yang tersedia di sistem",
      },
    },
  )

  // GET /books/search?q=query - Public
  .get(
    "/search",
    async ({ query }) => {
      const books = await BookService.searchBooks(query.q || "");
      return Response.json(books);
    },
    {
      query: t.Object({
        q: t.String(),
      }),
      detail: {
        tags: ["Book"],
        summary: "Search Books",
        description: "Mencari buku berdasarkan judul, author, atau book_id",
      },
    },
  )

  // GET /books/:book_id - Public
  .get(
    "/:book_id",
    async ({ params }) => {
      const book = await BookService.getBookByBookId(params.book_id);
      return Response.json(book);
    },
    {
      detail: {
        tags: ["Book"],
        summary: "Get Book By book_id",
        description:
          "Mengambil detail data buku berdasarkan book_id (e.g., MAT000001)",
      },
    },
  )

  // POST /books - Public (for development)
  .post(
    "/",
    async ({ body }) => {
      console.log("[DEBUG] POST /books called with:", body);
      const result = await BookService.addBook(body);
      console.log("[DEBUG] Book created successfully");
      return result;
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        category_id: t.Number({ minimum: 1 }),
        author: t.Optional(t.String()),
        publisher: t.Optional(t.String()),
        publication_year: t.Optional(t.Number()),
        quantity: t.Number({ minimum: 1 }),
        status: t.Optional(
          t.Union([
            t.Literal("available"),
            t.Literal("loaned"),
            t.Literal("reserved"),
          ]),
        ),
        cover_url: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Book"],
        summary: "Add New Book",
        description:
          "Menambahkan data buku baru ke dalam sistem. Quantity menentukan berapa banyak copy yang dibuat.",
      },
    },
  )

  // PUT /books/:book_id - Public (for development)
  .put(
    "/:book_id",
    async ({ params, body }) => {
      console.log("[DEBUG] PUT /books/:book_id called with:", {
        book_id: params.book_id,
        body,
      });
      const result = await BookService.updateBook(params.book_id, body);
      console.log("[DEBUG] Book updated successfully");
      return Response.json(result);
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
        category_id: t.Optional(t.Number()),
        author: t.Optional(t.String()),
        publisher: t.Optional(t.String()),
        publication_year: t.Optional(t.Number()),
        status: t.Optional(
          t.Union([
            t.Literal("available"),
            t.Literal("loaned"),
            t.Literal("reserved"),
          ]),
        ),
        cover_url: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Book"],
        summary: "Update Book",
        description: "Memperbarui data buku berdasarkan book_id",
      },
    },
  )

  // DELETE /books/:book_id - Public (for development)
  .delete(
    "/:book_id",
    async ({ params }) => {
      console.log("[DEBUG] DELETE /books/:book_id called for:", params.book_id);
      const result = await BookService.deleteBook(params.book_id);
      console.log("[DEBUG] Book deleted successfully");
      return Response.json(result);
    },
    {
      detail: {
        tags: ["Book"],
        summary: "Delete Book",
        description: "Menghapus data buku berdasarkan book_id",
      },
    },
  )

  // Require authentication for mutations (future use)
  .derive(authMiddleware);
