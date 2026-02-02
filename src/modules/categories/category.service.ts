import { CategoryRepository } from './category.repository';
import { CreateCategoryDTO, UpdateCategoryDTO } from './category.model';
import { redisHelper } from '../../config/redis';
import { invalidateCache } from '../../middleware/cache.middleware';

export const CategoryService = {
  async getAllCategories() {
    const cacheKey = 'categories:all';

    try {
      const cached = await redisHelper.getCache(cacheKey);
      if (cached) {
        console.log('[Cache HIT] categories:all');
        return cached;
      }
      console.log('[Cache MISS] categories:all - Querying database...');
    } catch (error) {
      console.error('Cache read error:', error);
    }

    try {
      const categories = await CategoryRepository.findAllWithBookCount();

      await redisHelper.setCache(cacheKey, categories, 900); // 15 minutes
      console.log('Cached categories:all for 15 minutes');

      return categories;
    } catch (error) {
      throw new Error(`Gagal mengambil data kategori: ${error}`);
    }
  },

  async getCategoryByCode(code: string) {
    // Normalize to uppercase for consistency
    const upperCode = code.toUpperCase();
    const cacheKey = `categories:${upperCode}`;

    try {
      const cached = await redisHelper.getCache(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] categories:${upperCode}`);
        return cached;
      }
      console.log(`[Cache MISS] categories:${upperCode} - Querying database...`);
    } catch (error) {
      console.error('Cache read error:', error);
    }

    const category = await CategoryRepository.findByCode(upperCode);
    if (!category) {
      throw new Error('Kategori tidak ditemukan');
    }

    const bookCount = await CategoryRepository.getBookCount(upperCode);
    const result = {
      ...category,
      book_count: bookCount,
    };

    try {
      await redisHelper.setCache(cacheKey, result, 900); // 15 minutes
      console.log(`Cached categories:${upperCode} for 15 minutes`);
    } catch (error) {
      console.error('Cache write error:', error);
    }

    return result;
  },

  async createCategory(data: CreateCategoryDTO) {
    // Accept any case input, but store as uppercase for consistency
    const codeRegex = /^[A-Za-z0-9]+$/;
    const upperCode = data.code.toUpperCase();

    // Validate format (letters and numbers only, any case on input)
    if (!codeRegex.test(data.code)) {
      throw new Error(
        'Kode kategori hanya boleh berisi huruf dan angka (tanpa spasi atau karakter khusus)'
      );
    }

    if (upperCode.length < 2 || upperCode.length > 10) {
      throw new Error('Kode kategori harus 2-10 karakter');
    }

    // Check if category already exists (case-insensitive check)
    const existing = await CategoryRepository.findByCode(upperCode);
    if (existing) {
      throw new Error('Kode kategori sudah digunakan');
    }

    try {
      await CategoryRepository.create({
        code: upperCode,
        name: data.name,
        description: data.description,
      });

      // Invalidate categories cache
      const deleted = await invalidateCache('categories:*');
      console.log(`Invalidated ${deleted} category cache keys after create`);
    } catch (error) {
      throw new Error(`Gagal membuat kategori: ${error}`);
    }
  },

  async updateCategory(code: string, data: UpdateCategoryDTO) {
    // Normalize to uppercase
    const upperCode = code.toUpperCase();

    // Check if category exists
    const existing = await CategoryRepository.findByCode(upperCode);
    if (!existing) {
      throw new Error('Kategori tidak ditemukan');
    }

    try {
      await CategoryRepository.update(upperCode, data);

      // Invalidate category cache
      await redisHelper.deleteCache(`categories:${upperCode}`);
      await redisHelper.deleteCache('categories:all');
      console.log(`Invalidated cache for category ${upperCode}`);
    } catch (error) {
      throw new Error(`Gagal memperbarui kategori: ${error}`);
    }
  },

  async deleteCategory(code: string) {
    // Normalize to uppercase
    const upperCode = code.toUpperCase();

    // Check if category exists
    const existing = await CategoryRepository.findByCode(upperCode);
    if (!existing) {
      throw new Error('Kategori tidak ditemukan');
    }

    try {
      await CategoryRepository.delete(upperCode);

      // Invalidate categories cache
      const deleted = await invalidateCache('categories:*');
      console.log(`Invalidated ${deleted} category cache keys after delete`);
    } catch (error) {
      throw new Error(`Gagal menghapus kategori: ${error}`);
    }
  },
};
