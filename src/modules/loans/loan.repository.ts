import prisma from "../../database/client";
import { Prisma } from "../../generated/client";
import { CreateLoanDTO, Loan } from "./loan.model";

export const LoanRepository = {
  /**
   * Get all loans with book and member details
   */
  async findAll(): Promise<Loan[]> {
    const loans = await prisma.loan.findMany({
      include: {
        inventory: {
          include: {
            book: {
              // ✅ Fixed: relation name is 'book' not 'catalog'
              select: { title: true },
            },
          },
        },
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { loan_date: "desc" },
    });

    return loans.map((l) => ({
      id: l.uuid, // Display uuid as id to frontend
      uuid: l.id, // Display id as uuid (loan number like "LN001")
      inventory_id: l.inventory_id,
      book_title: l.inventory.book.title, // ✅ Fixed: inventory.book.title
      member_id: l.member.id,
      member_name: l.member.name,
      loan_date: l.loan_date.toISOString().split("T")[0],
      return_date: l.return_date
        ? l.return_date.toISOString().split("T")[0]
        : null,
      condition_on_return: l.condition_on_return || null,
      notes: l.notes || null,
    }));
  },

  /**
   * Get a single loan by ID
   */
  async findById(id: string): Promise<Loan | null> {
    const loan = await prisma.loan.findUnique({
      where: { uuid: id },
      include: {
        inventory: {
          include: {
            book: {
              // ✅ Fixed: relation name is 'book' not 'catalog'
              select: { title: true },
            },
          },
        },
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!loan) return null;

    return {
      id: loan.uuid,
      uuid: loan.id,
      inventory_id: loan.inventory_id,
      book_title: loan.inventory.book.title, // ✅ Fixed: inventory.book.title
      member_id: loan.member.id,
      member_name: loan.member.name,
      loan_date: loan.loan_date.toISOString().split("T")[0],
      return_date: loan.return_date
        ? loan.return_date.toISOString().split("T")[0]
        : null,
      condition_on_return: loan.condition_on_return || null,
      notes: loan.notes || null,
    };
  },

  /**
   * Create a new loan
   * IMPORTANT: No stock manipulation here!
   * We only update inventory status from 'available' to 'loaned'
   */
  async create(
    tx: Prisma.TransactionClient,
    loan: CreateLoanDTO,
  ): Promise<string> {
    // Validate member exists
    const member = await tx.member.findUnique({
      where: { id: loan.id },
      select: { uuid: true },
    });

    if (!member) {
      throw new Error("Member tidak ditemukan");
    }

    // Find available book from the catalog
    const availableBook = await tx.bookInventory.findFirst({
      where: {
        book_id: loan.catalog_id,
        status: "available",
      },
      select: { id: true },
    });

    if (!availableBook) {
      throw new Error("Tidak ada buku yang tersedia untuk dipinjam");
    }

    // Generate loan ID (simplified - alternative to SQL function)
    const loanCount = await tx.loan.count();
    const loanId = `LN${String(loanCount + 1).padStart(3, "0")}`;

    // Create loan record
    const newLoan = await tx.loan.create({
      data: {
        id: loanId,
        inventory_id: availableBook.id,
        member_uuid: member.uuid,
        loan_date: loan.loan_date ? new Date(loan.loan_date) : new Date(),
      },
      select: { uuid: true },
    });

    // ✅ CRITICAL: Only update inventory status, NOT stock!
    await tx.bookInventory.update({
      where: { id: availableBook.id },
      data: { status: "loaned" },
    });

    return newLoan.uuid;
  },

  /**
   * Return a loaned book
   * IMPORTANT: No stock manipulation here!
   * We only update inventory status from 'loaned' back to 'available'
   */
  async returnLoan(
    tx: Prisma.TransactionClient,
    loanId: string,
    conditionOnReturn?: string,
  ): Promise<void> {
    // Update loan record
    const loan = await tx.loan.updateMany({
      where: {
        uuid: loanId,
        return_date: null, // Only if not already returned
      },
      data: {
        return_date: new Date(),
        condition_on_return: conditionOnReturn || null,
      },
    });

    if (loan.count === 0) {
      throw new Error("Pinjaman tidak ditemukan atau sudah dikembalikan");
    }

    // Get inventory_id to update status
    const loanData = await tx.loan.findUnique({
      where: { uuid: loanId },
      select: { inventory_id: true },
    });

    if (!loanData) {
      throw new Error("Loan data not found");
    }

    // ✅ CRITICAL: Only update inventory status, NOT stock!
    let newStatus: "available" | "damaged" = "available";
    if (conditionOnReturn === "damaged" || conditionOnReturn === "poor") {
      newStatus = "damaged";
    }

    await tx.bookInventory.update({
      where: { id: loanData.inventory_id },
      data: { status: newStatus },
    });
  },

  /**
   * Update loan details (not for returning books)
   */
  async updatePartial(
    tx: Prisma.TransactionClient,
    loanId: string,
    data: {
      loan_date?: string;
      notes?: string;
    },
  ): Promise<void> {
    const updateData: Prisma.LoanUpdateInput = {};

    if (data.loan_date) {
      updateData.loan_date = new Date(data.loan_date);
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    if (Object.keys(updateData).length === 0) return;

    await tx.loan.updateMany({
      where: {
        uuid: loanId,
        return_date: null, // Only active loans
      },
      data: updateData,
    });
  },

  /**
   * Delete a loan (use with caution)
   * Should restore inventory status if loan wasn't returned
   */
  async delete(id: string): Promise<void> {
    // Get loan details first
    const loan = await prisma.loan.findUnique({
      where: { uuid: id },
      select: {
        inventory_id: true,
        return_date: true,
      },
    });

    if (!loan) {
      throw new Error("Loan tidak ditemukan");
    }

    // If loan wasn't returned, restore inventory status
    if (!loan.return_date) {
      await prisma.bookInventory.update({
        where: { id: loan.inventory_id },
        data: { status: "available" },
      });
    }

    // Delete the loan
    await prisma.loan.delete({
      where: { uuid: id },
    });
  },
};
