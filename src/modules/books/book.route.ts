import { Elysia, t } from "elysia";
import { BookService } from "./book.service";
import { CreateBookCatalogDTO } from "./book.model";
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

  // GET /books/:id - Public
  .get(
    "/:id",
    async ({ params }) => {
      const book = await BookService.getBookById(params.id);
      return Response.json(book);
    },
    {
      detail: {
        tags: ["Book"],
        summary: "Get Book By ID",
        description: "Mengambil detail data buku berdasarkan ID",
      },
    },
  )

  // Require authentication for mutations
  .derive(authMiddleware)

  // POST /books - Protected
  .post(
    "/",
    async ({ body }) => {
      return await BookService.addBook(body as CreateBookCatalogDTO);
    },
    {
      body: t.Object({
        title: t.String(),
        category_code: t.String(),
        author: t.String(),
        publisher: t.String(),
        year: t.Number(),
        stock: t.Number({ minimum: 0 }),
      }),
      detail: {
        tags: ["Book"],
        summary: "Add New Book (Protected)",
        description:
          "Menambahkan data buku baru ke dalam sistem - requires admin auth",
        security: [{ Bearer: [] }],
      },
    },
  )

  // PUT /books/:id - Protected
  .put(
    "/:id",
    async ({ params, body }) => {
      return Response.json(
        await BookService.updateBook(
          params.id as string,
          body as Partial<CreateBookCatalogDTO>,
        ),
      );
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
        category_code: t.Optional(t.String()),
        author: t.Optional(t.String()),
        publisher: t.Optional(t.String()),
        year: t.Optional(t.Number()),
        stock: t.Optional(t.Number({ minimum: 0 })),
      }),
      detail: {
        tags: ["Book"],
        summary: "Update Book (Protected)",
        description:
          "Memperbarui data buku berdasarkan ID - requires admin auth",
        security: [{ Bearer: [] }],
      },
    },
  )

  // DELETE /books/:id - Protected
  .delete(
    "/:id",
    async ({ params }) => {
      return Response.json(await BookService.deleteBook(params.id as string));
    },
    {
      detail: {
        tags: ["Book"],
        summary: "Delete Book (Protected)",
        description: "Menghapus data buku berdasarkan ID - requires admin auth",
        security: [{ Bearer: [] }],
      },
    },
  );
