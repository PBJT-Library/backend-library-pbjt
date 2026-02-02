import { MemberRepository } from './member.repository';
import { CreateMemberDTO } from './member.model';
import { AppError } from '../../handler/error';
import { redisHelper } from '../../config/redis';
import { invalidateCache } from '../../middleware/cache.middleware';

export const MemberService = {
  async getAllMembers() {
    const cacheKey = 'members:all';

    try {
      const cached = await redisHelper.getCache(cacheKey);
      if (cached) {
        console.log('[Cache HIT] members:all');
        return cached;
      }
      console.log('[Cache MISS] members:all - Querying database...');
    } catch (error) {
      console.error('Cache read error:', error);
    }

    const members = await MemberRepository.findAll();

    try {
      await redisHelper.setCache(cacheKey, members, 300);
      console.log('Cached members:all for 5 minutes');
    } catch (error) {
      console.error('Cache write error:', error);
    }

    return members;
  },

  async getMemberById(id: string) {
    const cacheKey = `members:${id}`;

    try {
      const cached = await redisHelper.getCache(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] members:${id}`);
        return cached;
      }
      console.log(`[Cache MISS] members:${id} - Querying database...`);
    } catch (error) {
      console.error('Cache read error:', error);
    }

    const member = await MemberRepository.findByMemberId(id);
    if (!member) {
      throw new AppError('Member tidak ditemukan', 404);
    }

    try {
      await redisHelper.setCache(cacheKey, member, 600);
      console.log(`Cached members:${id} for 10 minutes`);
    } catch (error) {
      console.error('Cache write error:', error);
    }

    return member;
  },

  async searchMembers(query: string) {
    // If no query, return all members
    if (!query || query.trim().length === 0) {
      return this.getAllMembers();
    }

    const cacheKey = `members:search:${query}`;

    try {
      const cached = await redisHelper.getCache(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] members:search:${query}`);
        return cached;
      }
      console.log(`[Cache MISS] members:search:${query} - Querying database...`);
    } catch (error) {
      console.error('Cache read error:', error);
    }

    const members = await MemberRepository.search(query);

    try {
      await redisHelper.setCache(cacheKey, members, 300);
      console.log(`Cached members:search:${query} for 5 minutes`);
    } catch (error) {
      console.error('Cache write error:', error);
    }

    return members;
  },

  async addMember(data: CreateMemberDTO) {
    if (data.semester < 1 || data.semester > 14) {
      throw new AppError('Semester tidak valid', 400);
    }

    await MemberRepository.create(data);

    try {
      const deleted = await invalidateCache('members:*');
      console.log(`Invalidated ${deleted} member cache keys after create`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }

    return {
      message: 'Member berhasil ditambahkan',
    };
  },

  async updateMember(id: string, data: Partial<CreateMemberDTO>) {
    const member = await MemberRepository.findByMemberId(id);
    if (!member) {
      throw new AppError('Member tidak ditemukan', 404);
    }

    await MemberRepository.update(id, data);

    try {
      await redisHelper.deleteCache(`members:${id}`);
      await redisHelper.deleteCache('members:all');
      console.log(`Invalidated cache for member ${id} and members:all`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }

    return {
      message: 'Member berhasil diperbarui',
    };
  },

  async deleteMember(id: string) {
    const member = await MemberRepository.findByMemberId(id);
    if (!member) {
      throw new AppError('Member tidak ditemukan', 404);
    }

    await MemberRepository.delete(id);

    try {
      const deleted = await invalidateCache('members:*');
      console.log(`Invalidated ${deleted} member cache keys after delete`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }

    return {
      message: 'Member berhasil dihapus',
    };
  },
};
