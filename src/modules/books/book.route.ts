import { Elysia, t } from "elysia";
import { BookService } from "./book.service";
import { CreateBookDTO } from "./book.model";

export const bookRoute = new Elysia({ prefix: "/books" })
  // GET /books
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

  // GET /books/:id
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

  // POST /books
  .post(
    "/",
    async ({ body }) => {
      return await BookService.addBook(body as CreateBookDTO);
    },
    {
      body: t.Object({
        id: t.String(),
        title: t.String(),
        category: t.String(),
        author: t.String(),
        publisher: t.String(),
        year: t.Number(),
        stock: t.Number({ minimum: 0 }),
      }),
      detail: {
        tags: ["Book"],
        summary: "Add New Book",
        description: "Menambahkan data buku baru ke dalam sistem",
      },
    },
  )

  // PUT /books/:id
  .put(
    "/:id",
    async ({ params, body }) => {
      return Response.json(
        await BookService.updateBook(
          params.id as string,
          body as Partial<CreateBookDTO>,
        ),
      );
    },
    {
      body: t.Object({
        id: t.Optional(t.String()),
        title: t.Optional(t.String()),
        category: t.Optional(t.String()),
        author: t.Optional(t.String()),
        publisher: t.Optional(t.String()),
        year: t.Optional(t.Number()),
        stock: t.Optional(t.Number({ minimum: 0 })),
      }),
      detail: {
        tags: ["Book"],
        summary: "Update Book",
        description: "Memperbarui data buku berdasarkan ID",
      },
    },
  )

  // DELETE /books/:id
  .delete(
    "/:id",
    async ({ params }) => {
      return Response.json(await BookService.deleteBook(params.id as string));
    },
    {
      detail: {
        tags: ["Book"],
        summary: "Delete Book",
        description: "Menghapus data buku berdasarkan ID",
      },
    },
  );
